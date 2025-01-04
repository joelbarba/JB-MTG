import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { BfConfirmService, BfDnDModule, BfDnDService, BfUiLibModule } from 'bf-ui-lib';
import { GameStateService } from '../../game-state.service';
import { ESubPhase, TActionParams, TGameCard, TGameState } from '../../../../core/types';
import { Subscription } from 'rxjs';
import { HoverTipDirective } from '../../../../core/common/internal-lib/bf-tooltip/bf-tooltip.directive';
import { GameCardComponent } from "../game-card/game-card.component";

type TCol = {
  attackingCard: TGameCard;
  defendingCard: TGameCard | undefined;
  hoverDefender: TGameCard | undefined;
  isPossibleTarget: boolean;
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
    GameCardComponent,
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
  @Output() selectEffects = new EventEmitter<any>();

  stateSub!: Subscription;
  minimized = false;

  canSubmitAttack = false;
  canSubmitDefense = false;

  youControl = false;  // Whether you have control of the game
  
  title = 'Combat';
  
  subPhase!: ESubPhase | null;

  mainInfo = '';
  itemInfo = '';

  interval!: ReturnType<typeof setInterval>;
  progressBar = 0;
  showTimer = false;

  anyDefenders = false; // Whether there is any defender assigned

  hCardsLen = 1;  // Max number of cards on a horizontal line  

  constructor(public game: GameStateService) {}

  ngOnInit() {
    
    // const controlPlayer = this.game.state.control === '1' ? this.game.state.player1 : this.game.state.player2;
    // const summonerPlayer      = this.summoner === 'A' ? this.game.playerA() : this.game.playerB();
    // const interruptingPlayer  = this.summoner === 'A' ? this.game.playerB() : this.game.playerA();
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

    this.attackingCreatures = this.game.state.cards.filter(c => c.combatStatus === 'combat:attacking').sort((a, b) => a.order > b.order ? 1 : -1);
    this.defendingCreatures = this.game.state.cards.filter(c => c.combatStatus === 'combat:defending').sort((a, b) => a.order > b.order ? 1 : -1);

    this.combatCards = this.attackingCreatures.map(attackingCard => {
      const defendingCard = this.defendingCreatures.find(c => c.blockingTarget === attackingCard.gId);
      return { attackingCard, defendingCard, hoverDefender: undefined, isPossibleTarget: true };
    });

    this.canSubmitAttack = !!state.options.find(op => op.action === 'submit-attack');
    this.canSubmitDefense = !!state.options.find(op => op.action === 'submit-defense');
    this.anyDefenders = !!this.defendingCreatures.length;

    this.hCardsLen = this.attackingCreatures.length;

    // Set this.mainInfo to give a human-readable definition of the status
    if (this.attacker === 'A') { // You are the attacker
      if (state.subPhase === 'selectAttack') { this.mainInfo = `Select what creatures you want to attack with`; }
      if (state.subPhase === 'attacking') {
        if (!this.youControl) { this.mainInfo = `Waiting for the opponent to defend or cast any spells`; }
        else { this.mainInfo = `You may play spells or abilities before the defense is set`; }
      }
      if (state.subPhase === 'selectDefense') { this.mainInfo = `Waiting for the opponent to select the defense`; }
      if (state.subPhase === 'defending') {
        if (!this.youControl) { this.mainInfo = `Waiting for the opponent before the combat is executed`; }
        else {
          if (!this.anyDefenders) { this.mainInfo = `The opponent is not defending your attack.<br/>`;  }
          else { this.mainInfo = `The opponent has assigned their defense.<br/>`;  }
          this.mainInfo += `You may play spells or abilities before the combat is executed`; 
        }
      }
      if (state.subPhase === 'afterCombat') {
        if (!this.youControl) { this.mainInfo = `Waiting for the opponent before dying creatures are destroyed`; }
        else { this.mainInfo = `You may play spells or abilities before dying creatures are destroyed`; }
      }

    } else { // You are the defender
      if (state.subPhase === 'selectAttack') { this.mainInfo = `Your opponent is selecting creatures to attack you (wait for it)`; }
      if (state.subPhase === 'attacking') {
        if (this.youControl) { this.mainInfo = `You may play spells or abilities before you select your defense`; }
        else { this.mainInfo = `Wait for the opponent to play spells or abilities`; }
      }
      if (state.subPhase === 'selectDefense') { this.mainInfo = `Select what creatures you want to defend with, or do not defend`; }
      if (state.subPhase === 'defending') {
        if (!this.youControl) { this.mainInfo = `Waiting for the opponent cast spells before the combat is executed`; }
        else { this.mainInfo = `You may play spells or abilities before the combat is executed`; }
      }
      if (state.subPhase === 'afterCombat') {
        if (!this.youControl) { this.mainInfo = `Waiting for the opponent cast spells before dying creatures are destroyed`; }
        else { this.mainInfo = `You may play spells or abilities before dying creatures are destroyed`; }
      }
    }

    if (state.control === this.game.playerANum) {
      this.defenderLookingForTarget = this.game.state.cards.find(c => c.combatStatus === 'combat:selectingTarget');
      if (this.defenderLookingForTarget) {
        this.mainInfo = `Select what creature you want ${this.defenderLookingForTarget.name} to defend against`;
        const possibleBlockers = this.defenderLookingForTarget.targetBlockers(state);
        this.combatCards.forEach(col => {
          col.isPossibleTarget = possibleBlockers.includes(col.attackingCard.gId);
        });
      }
    }

    // Timer for the step auto continue
    this.initTimer();
  }



  ngOnChanges() {
  }

  ngOnDestroy() {
    if (this.stateSub) { this.stateSub.unsubscribe(); }
    if (this.interval) { clearInterval(this.interval); }
  }



  hoveringCol?: TCol;
  hoverCol(col?: TCol) {
    this.hoveringCol = col;
    this.combatCards.forEach(col => col.hoverDefender = undefined);
    this.itemInfo = ``;
    if (col && !col.defendingCard && this.defenderLookingForTarget) {
      if (col.isPossibleTarget) {
        col.hoverDefender = this.defenderLookingForTarget;
        this.itemInfo = `Defend ${col.attackingCard.name} with ${this.defenderLookingForTarget.name}`;
      } else {
        this.itemInfo = `You cannot defend ${col.attackingCard.name} with ${this.defenderLookingForTarget.name}`;
      }
    }
  }

  clickCol(col: TCol) {
    console.log(col);
    if (!col.defendingCard && this.defenderLookingForTarget && col.attackingCard.selectableAction) {
      const option = col.attackingCard.selectableAction;
      this.game.action(option.action, option.params);
    }
  }

  waitAttacking = false;
  waitDefending = false;
  waitAfterCombat = false;

  // Init the timer to automatically release the stack after a few seconds
  initTimer() {
    if (!this.youControl) { return; }
    if (this.subPhase !== 'attacking' && this.subPhase !== 'defending' && this.subPhase !== 'afterCombat') { return; }
    if (this.subPhase === 'attacking' && this.waitAttacking) { return; }
    if (this.subPhase === 'defending' && this.waitDefending) { return; }
    if (this.subPhase === 'afterCombat' && this.waitAfterCombat) { return; }
    
    

    this.showTimer = true;
    const waitingMs = 5000;
    const ctrlTime = (new Date()).getTime();
    if (this.interval) { clearInterval(this.interval); }
    this.interval = setInterval(() => {
      this.progressBar = Math.min(100, ((new Date()).getTime() - ctrlTime) * 200 / waitingMs);
      if (this.progressBar >= 100) { // Max reach
        console.log('AUTO Continue');
        this.releaseStack();
      }
    }, 25);
  }

  pause() { // Stop the auto stack release
    clearInterval(this.interval);
    this.showTimer = false;
    if (this.subPhase === 'attacking')   { this.waitAttacking = true; }
    if (this.subPhase === 'defending')   { this.waitDefending = true; }
    if (this.subPhase === 'afterCombat') { this.waitAfterCombat = true; }
  }


  submitAttack()  { this.game.action('submit-attack'); }
  submitDefense() { this.game.action('submit-defense'); }
  cancelAttack()  { this.game.action('cancel-attack'); }
  cancelDefense() { this.game.action('cancel-defense'); }

  releaseStack() {
    clearInterval(this.interval);
    this.showTimer = false;
    this.game.action('release-stack');
  }

  selectEffectsBadge(card: TGameCard, ev?: MouseEvent) {
    this.selectEffects.emit(card);
    if (ev) { ev.stopPropagation(); }
  }


  close() {
    if (this.stateSub) { this.stateSub.unsubscribe(); }
    if (this.interval) { clearInterval(this.interval); }
    this.end.emit();
  }

}
