import { Component, ElementRef, EventEmitter, Inject, Input, Output, ViewChild } from '@angular/core';
import { CommonModule, DOCUMENT, ViewportScroller } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { DocumentReference, Firestore, collection, doc, getDoc, getDocs, onSnapshot, query, setDoc, DocumentData, Unsubscribe } from '@angular/fire/firestore';
import { BfConfirmService, BfUiLibModule } from '@blueface_npm/bf-ui-lib';
import { GameStateService } from '../../game-state.service';
import { Router } from '@angular/router';
import { getTime } from '../gameLogic/game.utils';
import { Subscription } from 'rxjs';

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
  isOpen = true;
  chatDocSub!: Unsubscribe;
  
  text = '';
  allMsgs: Array<{ time: string, isYou: boolean, text: string }> = [];
  chatHistory: Array<{ time: string, isYou: boolean, text: string }> = [];
  playerBName = '';
  doc: Document;

  @ViewChild('chatHist', {read: ElementRef, static: false}) chatHist!: ElementRef;

  constructor(
    public game: GameStateService,
    public router: Router,
    public firestore: Firestore,
    private scroller: ViewportScroller,
    @Inject(DOCUMENT) document: Document,
  ) {
    this.doc = document;
  }

  ngOnInit() {
    this.game.firstStateDef.promise.then(() => {
      const chatColRef = collection(this.firestore, 'gamesChat', this.game.gameId, 'chat');

      this.chatHistory = [];
      this.playerBName = this.game.playerB().name;
      
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

        setTimeout(() => this.scrollToBottom(), 300);
      });
      
      setTimeout(() => this.scrollToBottom(), 300);
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
    this.router.navigate(['/game']);
  }

}
