import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { BfConfirmService, BfDnDModule, BfDnDService, BfUiLibModule } from '@blueface_npm/bf-ui-lib';
import { ISummonOp, ITargetOp } from '../game.component';
import { GameStateService } from '../../game-state.service';
import { ESubPhase, TActionParams, TGameCard, TGameState } from '../../../../core/types';
import { Subscription } from 'rxjs';

type TCol = {
  attackingCard: TGameCard;
  defendingCard: TGameCard | undefined;
  hoverDefender: TGameCard | undefined;
};


@Component({
  selector: 'dialog-combat',
  standalone: true,
  imports: [
    CommonModule,
    BfDnDModule,
    TranslateModule,
    FormsModule,
    BfUiLibModule,    
  ],
  templateUrl: './dialog-combat.component.html',
  styleUrl: './dialog-combat.component.scss'
})
export class DialogCombatComponent {
  @Input({ required: true }) attacker!: 'A' | 'B';
  @Output() end = new EventEmitter<any>();
  @Output() hoverCard = new EventEmitter<any>();
  @Output() clearHover = new EventEmitter<any>();

  // progress = 0; // Counter to the up time (never stops until it reaches it)
  // progressBar = 0;  // Displayed progress (it stops when it's paused or reaches)
  // interval!: ReturnType<typeof setInterval>;
  // isPaused = false;
  // isRemotePaused = false;
  stateSub!: Subscription;
  minimized = false;

  canSubmitAttack = false;
  canSubmitDefense = false;

  youControl = false;  // Whether you have control of the game
  
  target?: TGameCard | 'playerA' | 'playerB';
  title = 'Combat';
  
  subPhase!: ESubPhase | null;

  mainInfo = '';
  itemInfo = '';
  

  constructor(public game: GameStateService) {}

  ngOnInit() {
    // Find the summoning card
    const { hand } = this.game.getCards(this.game.state, 'player' + this.attacker as 'playerA' | 'playerB');

    
    // const controlPlayer = this.game.state.control === '1' ? this.game.state.player1 : this.game.state.player2;
    // const summonerPlayer      = this.summoner === 'A' ? this.game.playerA() : this.game.playerB();
    // const interruptingPlayer  = this.summoner === 'A' ? this.game.playerB() : this.game.playerA();
    // controlPlayer.controlTime = (new Date()).getTime(); // TODO: REMOVE THISSSSSSSSSSS!!!!!!!!!!!!!!!!!!!!!!!
    // console.log('Summoning Event', this.card);
    const youControl = (this.game.state.control === this.game.playerANum);
    
    if (this.attacker === 'A') {
      // this.title = `Summoning ${this.card.name}`;
      let msg = `COMBAT PANEL - You are playerA = player${this.game.playerANum} (attacker). `;
      if (youControl) { msg += 'Select your attacking creatures'; } 
      else { msg += `Waiting for playerB = player${this.game.playerBNum} to select their defense.`; }
      console.log(msg);

      if (youControl) { this.title = `Combat: Select Attacking Creatures`; }
      else { this.title = `Combat: Opponent Defending`; }

    } else { // summoner === B
      // this.title = `Opponent is summoning ${this.card.name}`;
      let msg = `COMBAT PANEL - You are playerA = player${this.game.playerANum} (defender). `;
      if (this.game.state.control === this.game.playerANum) { msg += 'Select your defending creatures'; } 
      else { msg += `Waiting for playerB = player${this.game.playerBNum} to select their attacking creatures.`; }
      console.log(msg);

      if (youControl) { this.title = `Combat: Select Defending Creatures`; }
      else { this.title = `Combat: Opponent Selecting Attacking Creatures`; }
    }



    // React on state changes
    this.stateSub = this.game.stateExt$.subscribe(state => this.onStateChanges(state));
    this.onStateChanges(this.game.state);
  }


  combatCards: Array<TCol> = [];

  attackingCreatures!: Array<TGameCard>;
  defendingCreatures!: Array<TGameCard>;
  // yourCreatures!: Array<TGameCard>;
  // oppCreatures!: Array<TGameCard>;

  defenderLookingForTarget?: TGameCard;   // When setting a defending creature, but waiting to select an attacker target to defend


  onStateChanges(state: TGameState) {
    const playerB = this.game.playerANum === '1' ? state.player2 : state.player1;
    this.subPhase = this.game.state.subPhase;
    this.youControl = (this.game.state.control === this.game.playerANum);

    this.attackingCreatures = this.game.state.cards.filter(c => c.status === 'combat:attacking').sort((a, b) => a.order > b.order ? 1 : -1);
    this.defendingCreatures = this.game.state.cards.filter(c => c.status === 'combat:defending').sort((a, b) => a.order > b.order ? 1 : -1);

    this.combatCards = this.attackingCreatures.map(attackingCard => {
      const defendingCard = this.defendingCreatures.find(c => c.targets?.includes(attackingCard.gId));
      return { attackingCard, defendingCard, hoverDefender: undefined };
    })


    // if (this.attacker === 'A') {
    //   this.yourCreatures = this.attackingCreatures;
    //   this.oppCreatures  = this.defendingCreatures;
    // } else {
    //   this.yourCreatures = this.defendingCreatures;
    //   this.oppCreatures  = this.attackingCreatures;
    // }

    // if (!playerB.controlTime) { this.isRemotePaused = true; }
    // if (state.control === this.game.playerANum) {
    //   if (this.stateSub) { this.stateSub.unsubscribe(); }
    //   this.endSummoning();
    // }
    this.canSubmitAttack = !!state.options.find(op => op.action === 'submit-attack');
    this.canSubmitDefense = !!state.options.find(op => op.action === 'submit-defense');

    if (state.control === this.game.playerANum) {
      this.defenderLookingForTarget = this.game.state.cards.find(c => c.status === 'combat:selectingTarget');
      if (this.defenderLookingForTarget) {
        this.mainInfo = `Select what creature you want ${this.defenderLookingForTarget.name} to defend against`;
      }
    }
  }


  ngOnChanges() {
  }

  ngOnDestroy() {
    if (this.stateSub) { this.stateSub.unsubscribe(); }
    // if (this.interval) { clearInterval(this.interval); }
  }



  hoveringCol?: TCol;
  hoverCol(col?: TCol) {
    this.hoveringCol = col;
    this.combatCards.forEach(col => col.hoverDefender = undefined);
    this.itemInfo = ``;
    if (col && this.defenderLookingForTarget) { 
      col.hoverDefender = this.defenderLookingForTarget;
      this.itemInfo = `Defend ${col.attackingCard.name} with ${this.defenderLookingForTarget.name}`;
    }
  }

  clickCol(col: TCol) {
    console.log(col);
    if (this.defenderLookingForTarget && col.attackingCard.selectableAction) {
      const option = col.attackingCard.selectableAction;
      this.game.action(option.action, option.params);
    }
  }

  submitAttack()  { this.game.action('submit-attack'); }
  submitDefense() { this.game.action('submit-defense'); }
  cancelAttack()  { this.game.action('cancel-attack'); }
  cancelDefense() { this.game.action('cancel-defense'); }

  endCombat() {
    if (this.attacker === 'B') {
      this.game.action('end-interrupting'); // switch back control to the attacker
    } else {
      this.game.action('end-combat'); // end combat phase
    }
  }


  close() {
    if (this.stateSub) { this.stateSub.unsubscribe(); }
    // if (this.interval) { clearInterval(this.interval); }
    this.end.emit();
  }

}
