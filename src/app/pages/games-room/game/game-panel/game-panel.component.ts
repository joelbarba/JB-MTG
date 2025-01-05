import { Component, ElementRef, EventEmitter, Inject, Input, Output, ViewChild } from '@angular/core';
import { CommonModule, DOCUMENT, ViewportScroller } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { DocumentReference, Firestore, collection, doc, getDoc, getDocs, onSnapshot, query, setDoc, DocumentData, Unsubscribe } from '@angular/fire/firestore';
import { BfConfirmService, BfGrowlService, BfUiLibModule } from 'bf-ui-lib';
import { GameStateService } from '../gameLogic/game-state.service';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { getTime } from '../../../../core/common/commons';

type TDBChatMsg = { player: string, text: string };
type TChatMsg = { text: string, isYou: boolean };

@Component({
  selector: 'game-panel',
  standalone: true,
  imports: [
    CommonModule,
    TranslateModule,
    FormsModule,
    BfUiLibModule,    
  ],
  templateUrl: './game-panel.component.html',
  styleUrl: './game-panel.component.scss'
})
export class GamePanelComponent {
  isOpen = false;
  chatDocSub!: Unsubscribe;
  
  text = '';
  allMsgs: Array<{ time: string, isYou: boolean, text: string }> = [];
  chatHistory: Array<{ time: string, isYou: boolean, text: string }> = [];
  playerBName = '';

  @ViewChild('chatHist', {read: ElementRef, static: false}) chatHist!: ElementRef;

  constructor(
    public game: GameStateService,
    public router: Router,
    public firestore: Firestore,
    public growl: BfGrowlService,
  ) {

  }

  ngOnInit() {
    this.game.firstStateDef.promise.then(() => {
      const chatColRef = collection(this.firestore, 'gamesChat', this.game.gameId, 'chat');

      this.chatHistory = [];
      this.playerBName = this.game.playerB().name;
      let firstLoad = true;
      
      if (this.chatDocSub) { this.chatDocSub(); } // unsubscribe if previous detected
      this.chatDocSub = onSnapshot(chatColRef, (colQuery) => {
        const source = colQuery.metadata.hasPendingWrites ? 'local' : 'server';
        
        const newMsgs: Array<{ time: string, isYou: boolean, text: string }> = [];
        colQuery.forEach(doc => {
          const data = doc.data() as TDBChatMsg;
          const isYou = data.player === this.game.playerANum;
          const msg = { time: doc.id, isYou, text: data.text };
          const exists = this.allMsgs.find(m => m.time === msg.time && msg.isYou === msg.isYou && msg.text === msg.text);
          if (!exists) { newMsgs.push(msg); }
        });
        newMsgs.sort((a, b) => a.time > b.time ? 1: -1);

        let lastMsg = this.chatHistory.at(-1);
        for (let t = 0; t < newMsgs.length; t++) {
          const newMsg = newMsgs[t];
          this.allMsgs.push({ ...newMsg });
          if (lastMsg && lastMsg.isYou === newMsg.isYou) {
            lastMsg.text += `<br>` + newMsg.text;
            lastMsg.time = newMsg.time;
          } else {
            this.chatHistory.push(newMsg);
            lastMsg = newMsg;
          }
        }

        if (!firstLoad && newMsgs.length && !this.isOpen) {
          const text = newMsgs.filter(m => !m.isYou).reduce((a,v) => `${a}<br/>${v.text}`, '');
          this.growl.pushMsg({ text: `New chat message: <b>${text}</b>`, timeOut: 3000, msgIcon: 'icon-bubble-lines3', msgType: 'success' });
        }

        setTimeout(() => this.scrollToBottom(), 300);
        firstLoad = false;
      });
    });
  }

  ngOnChanges() { }

  ngAfterViewInit() {}

  ngOnDestroy() {
    // if (this.stateSub) { this.stateSub.unsubscribe(); }
  }

  // onStateChanges(state: TGameState) {
  //   const playerB = this.game.playerANum === '1' ? state.player2 : state.player1;
  // }

  panelPinned = false;
  clickToSwitch() {
    this.isOpen = !this.isOpen;
    this.panelPinned = this.isOpen;
  }
  hoverToOpen() {
    if (!this.isOpen) {
      this.isOpen = true;
      // setTimeout(() => this.isOpen && (this.panelPinned = true), 5000);
    }
  }
  hoverToClose() {
    if (!this.panelPinned) { this.isOpen = false; }
  }

  postChat(text: string) {
    const time = getTime().replace(' ', '_');
    const msg = { player: this.game.playerANum, text };
    setDoc(doc(this.firestore, 'gamesChat', this.game.gameId, 'chat', time), msg).then(_ => {});
    this.text = '';    
  }
  
  scrollToBottom() {
    const top = this.chatHist.nativeElement.scrollHeight;
    this.chatHist.nativeElement.scrollTo({ top, behavior: 'smooth' });
  }


  exitGame() {
    this.game.deactivateGame();
    this.router.navigate(['/game']);
  }

}
