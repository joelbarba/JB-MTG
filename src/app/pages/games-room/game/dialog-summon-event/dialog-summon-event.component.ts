import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { BfConfirmService, BfDnDModule, BfDnDService, BfUiLibModule } from '@blueface_npm/bf-ui-lib';
import { ISummonOp, ITargetOp } from '../game.component';
import { GameStateService } from '../../game-state.service';
import { TActionParams, TGameCard } from '../../../../core/types';
import { Subscription } from 'rxjs';

@Component({
  selector: 'dialog-summon-event',
  standalone: true,
  imports: [
    CommonModule,
    BfDnDModule,
    TranslateModule,
    FormsModule,
    BfUiLibModule,    
  ],
  templateUrl: './dialog-summon-event.component.html',
  styleUrl: './dialog-summon-event.component.scss'
})
export class DialogSummonEventComponent {
  // @Input() summonOp!: ISummonOp;
  // @Input() targetOp!: ITargetOp;
  // @Input() card?: TGameCard;
  @Input({ required: true }) summoner!: 'A' | 'B';
  @Output() end = new EventEmitter<any>();

  card?: TGameCard;  // Summoning card

  progress = 0; // Counter to the up time (never stops until it reaches it)
  progressBar = 0;  // Displayed progress (it stops when it's paused or reaches)
  interval!: ReturnType<typeof setInterval>;
  stateSub!: Subscription;
  isPaused = false;
  minimized = false;

  target?: TGameCard | 'playerA' | 'playerB';
  title = 'Summoning...';

  constructor(public game: GameStateService) {}

  ngOnInit() {
    // Find the summoning card
    const { hand } = this.game.getCards(this.game.state, 'player' + this.summoner as 'playerA' | 'playerB');
    this.card = hand.find(c => c.status === 'summoning');
    if (!this.card) { this.end.emit(); return; }
    
    const controlPlayer = this.game.state.control === '1' ? this.game.state.player1 : this.game.state.player2;
    const summonerPlayer      = this.summoner === 'A' ? this.game.playerA() : this.game.playerB();
    const interruptingPlayer  = this.summoner === 'A' ? this.game.playerB() : this.game.playerA();
    controlPlayer.controlTime = (new Date()).getTime(); // TODO: REMOVE THISSSSSSSSSSS!!!!!!!!!!!!!!!!!!!!!!!

    console.log('Summoning Event', this.card);
    
    if (this.summoner === 'A') {
      this.title = `Summoning ${this.card.name}`;
      console.log(`You are player A = player${this.game.playerANum} (summoner). Waiting for player B = player${this.game.playerBNum} to play interruptions`);
      
    } else { // summoner === B
      this.title = `Opponent is summoning ${this.card.name}`;
      console.log(`You are player A = player${this.game.playerANum}. Your opponent player B = player${this.game.playerBNum} (summoned) is waiting you playing interruptions`);
    }

   
    // Find targets on summoning card
    if (this.card.targets && this.card?.targets?.length > 0) {
      const targetId = this.card.targets[0];
      this.target = this.game.state.cards.find(c => c.gId === targetId);
      if (targetId === 'player' + this.game.playerANum) { this.target = 'playerA'; }
      if (targetId === 'player' + this.game.playerBNum) { this.target = 'playerB'; }
    }



    const waitingMs = 15000;    
    if (this.interval) { clearInterval(this.interval); }


    // Run the progress bar for the interrupter
    if (this.summoner === 'B') {
      const ctrlTime = this.game.playerA().controlTime;
      this.interval = setInterval(() => {
        this.progress = Math.min(200, ((new Date()).getTime() - ctrlTime) * 200 / waitingMs);
        if (!this.isPaused) { this.progressBar = this.progress; }
  
        if (this.progressBar >= 200) { this.endInterrupting(); } // Automatically skip
        if (this.progress >= 200) { clearInterval(this.interval); } // Max reach
      }, 25);
    }


    // Run the progress bar for the summoner
    if (this.summoner === 'A') {
      const ctrlTime = this.game.playerB().controlTime;
      this.interval = setInterval(() => {
        this.progress = Math.min(200, ((new Date()).getTime() - ctrlTime) * 200 / waitingMs);
        if (!this.isPaused) { this.progressBar = this.progress; }
        if (this.progress >= 200) { clearInterval(this.interval); } // Max reach
      }, 25);

      this.stateSub = this.game.state$.subscribe(state => { // React on state changes
        console.log('CONTROL =', state.control);
        if (state.control === this.game.playerANum) { // Interruptions finished. You are taking control back
          console.log('Now you can finish the summoning');
          // this.endSummoning();
        }
      });
    }

  }

  ngOnChanges() {}
  ngOnDestroy() {
    if (this.stateSub) { this.stateSub.unsubscribe(); }
  }


  pause() {
    this.isPaused = true;
  }

  continue() {
    this.isPaused = false;
  }

  endInterrupting() { // When you are done interrupting (summoner === 'B')
    if (this.interval) { clearInterval(this.interval); }
    if (this.summoner === 'B') {
      console.log('Ok, you are done interrupting');
      this.game.action('end-interrupting'); 
      this.end.emit();
    }
  }

  endSummoning() { // When the waiting for the opponent is over, end your summoning (summoner === 'A')
    if (this.interval) { clearInterval(this.interval); }
    if (this.summoner === 'A') {
      console.log('Ok, the opponent has finished with interruptions');
      if (this.card) {
        const params: TActionParams = { gId: this.card.gId };
        if (this.card.targets?.length) { params.targets = this.card.targets; }
        if (this.card.type === 'creature') { this.game.action('summon-creature', params); }
        if (this.card.type === 'instant')  { this.game.action('summon-instant-spell', params); }
        this.end.emit();
      }
    }
  }

}
