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
  @Output() selectCard = new EventEmitter<TGameCard>();
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

  submitDefenseBtnText = 'Defend with current selection';
  anyDefenders = false; // Whether there is any defender assigned

  hCardsLen = 1;  // Max number of cards on a horizontal line  

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
      this.title = `Combat: Attacking`;

      let msg = `COMBAT PANEL - You are playerA = player${this.game.playerANum} (attacker). `;
      if (youControl) { msg += 'Select your attacking creatures'; } 
      else { msg += `Waiting for playerB = player${this.game.playerBNum} to select their defense.`; }
      console.log(msg);

    } else { // summoner === B
      this.title = `Combat: Defending`;

      let msg = `COMBAT PANEL - You are playerA = player${this.game.playerANum} (defender). `;
      if (this.game.state.control === this.game.playerANum) { msg += 'Select your defending creatures'; } 
      else { msg += `Waiting for playerB = player${this.game.playerBNum} to select their attacking creatures.`; }
      console.log(msg);
    }



    // React on state changes
    this.stateSub = this.game.state$.subscribe(state => this.onStateChanges(state));
    this.onStateChanges(this.game.state);
  }


  combatCards: Array<TCol> = [];

  attackingCreatures!: Array<TGameCard>;
  defendingCreatures!: Array<TGameCard>;

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
    });

    this.canSubmitAttack = !!state.options.find(op => op.action === 'submit-attack');
    this.canSubmitDefense = !!state.options.find(op => op.action === 'submit-defense');
    this.anyDefenders = !!this.defendingCreatures.length;
    this.submitDefenseBtnText = this.anyDefenders ? 'Defend with current selection' : `Do not defend`;

    this.hCardsLen = this.attackingCreatures.length;

    // Set this.mainInfo to give a human-readable definition of the status
    if (this.attacker === 'A') { // You are the attacker
      if (state.subPhase === 'selectAttack') { this.mainInfo = `Select what creatures you want to attack with`; }
      if (state.subPhase === 'attacking') {
        if (!this.youControl) { this.mainInfo = `Waiting for the opponent to defend or cast any spells`; }
        else { this.mainInfo = `You may also cast spells before the defense is set`; }
      }
      if (state.subPhase === 'selectDefense') { this.mainInfo = `Waiting for the opponent to select the defense`; }

    } else { // You are the defender
      if (state.subPhase === 'selectAttack') { this.mainInfo = `Your opponent is selecting creatures to attack you (wait for it)`; }
      if (state.subPhase === 'attacking') {
        if (this.youControl) { this.mainInfo = `You may cast spells before you select your defense`; }
        else { this.mainInfo = `Wait for the opponent to cast any other spells`; }
      }
      if (state.subPhase === 'selectDefense') { this.mainInfo = `Select what creatures you want to defend with, or do not defend`; }
    }

    if (state.subPhase === 'defending') {
      if (!this.youControl) { this.mainInfo = `Waiting for the opponent cast spells before the combat is executed`; }
      else { this.mainInfo = `You may cast spells before the combat is executed`; }
    }
    if (state.subPhase === 'afterCombat') {
      if (!this.youControl) { this.mainInfo = `Waiting for the opponent cast spells before dying creatures are destroyed`; }
      else { this.mainInfo = `You may cast spells before dying creatures are destroyed`; }
    }



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
    if (col && !col.defendingCard && this.defenderLookingForTarget) { 
      col.hoverDefender = this.defenderLookingForTarget;
      this.itemInfo = `Defend ${col.attackingCard.name} with ${this.defenderLookingForTarget.name}`;
    }
  }

  clickCol(col: TCol) {
    console.log(col);
    if (!col.defendingCard && this.defenderLookingForTarget && col.attackingCard.selectableAction) {
      const option = col.attackingCard.selectableAction;
      this.game.action(option.action, option.params);
    }
  }

  submitAttack()  { this.game.action('submit-attack'); }
  submitDefense() { this.game.action('submit-defense'); }
  cancelAttack()  { this.game.action('cancel-attack'); }
  cancelDefense() { this.game.action('cancel-defense'); }

  releaseStack() {
    this.game.action('release-stack');
  }
  


  close() {
    if (this.stateSub) { this.stateSub.unsubscribe(); }
    // if (this.interval) { clearInterval(this.interval); }
    this.end.emit();
  }

}
