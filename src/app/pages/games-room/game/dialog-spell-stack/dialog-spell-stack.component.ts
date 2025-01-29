import { Component, ElementRef, EventEmitter, Input, Output, SimpleChanges, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { BfConfirmService, BfDnDModule, BfDnDService, BfUiLibModule } from 'bf-ui-lib';
import { GameStateService } from '../gameLogic/game-state.service';
import { TActionParams, TGameCard, TGameState, TPlayer } from '../../../../core/types';
import { Subscription } from 'rxjs';
import { StackCardWithTargetsComponent } from './stack-card-with-targets/stack-card-with-targets.component';
import { GameCardEventsService } from '../gameLogic/game-card-events.service';
import { WindowsService } from '../gameLogic/windows.service';
import { HoverTipDirective } from '../../../../core/common/internal-lib/bf-tooltip/bf-tooltip.directive';

export type TStackTree = {
  card: TGameCard | null,
  player: TPlayer | null,
  targetOf: Array<TStackTree>,
  shadow: { damage: number, defense: number, force: string, delta: string };
};

@Component({
  selector    :   'dialog-spell-stack',
  templateUrl : './dialog-spell-stack.component.html',
  styleUrl    : './dialog-spell-stack.component.scss',
  standalone: true,
  imports: [
    CommonModule,
    BfDnDModule,
    TranslateModule,
    FormsModule,
    BfUiLibModule,
    StackCardWithTargetsComponent,
    HoverTipDirective,
  ],
})
export class DialogSpellStackComponent {
  TIMER_TIME = 5000;

  title = 'Spell Stack';
  youControl: boolean = false;

  card?: TGameCard;  // Summoning card
  target?: TGameCard | 'playerA' | 'playerB';
  
  stateSub!: Subscription;
  interval!: ReturnType<typeof setInterval>;
  progressBar = 0;
  showTimer = false;

  mainInfo = '';
  itemInfo = '';
  
  hCardsLen = 1;  // Max number of cards on a horizontal line
  vCardsLen = 1;  // Max number of cards on a vertical line
  hasScroll = false;  // If the height of the stack > height of the window

  stackInfo: Array<string> = [];
  rootTargets: Array<TStackTree> = [];

  @ViewChild('stackWindow', { read: ElementRef, static: false }) stackWindow!: ElementRef;
  @ViewChild('stackEl', { read: ElementRef, static: false }) stackEl!: ElementRef;

  constructor(
    public game: GameStateService,
    public cardEv: GameCardEventsService,
    public win: WindowsService,
  ) {}

  ngOnInit() {
    const testingMode = localStorage.getItem('testingMode');
    if (testingMode) { this.TIMER_TIME = 500000000; }

    this.stateSub = this.game.state$.subscribe(state => this.onStateChanges(state));
    this.onStateChanges(this.game.state);
  }
  
  ngAfterViewInit() {
    // this.windowHeight = this.stackWindow.nativeElement.getBoundingClientRect().height;
    // console.log('Window rect. Height=', this.windowHeight, this.stackWindow.nativeElement.getBoundingClientRect());
  }

  // ngOnChanges(changes: SimpleChanges) {
  //   if (changes['panelSize']) { this.minimized = this.panelSize === 'min'; }
  // }

  ngOnDestroy() {
    if (this.stateSub) { this.stateSub.unsubscribe(); }
    if (this.interval) { clearInterval(this.interval); }
  }

  onStateChanges(state: TGameState) {
    const playerB = this.game.playerANum === '1' ? state.player2 : state.player1;
    this.youControl = this.game.state.control === this.game.playerANum;

    const stack = state.cards.filter(c => c.location === 'stack').sort((a, b) => a.order > b.order ? -1 : 1); // reverse order
    // console.log('STACK', stack);

    setTimeout(() => {
      const windowHeight = Math.round(this.stackWindow.nativeElement.getBoundingClientRect().height);
      const stackHeight = Math.round(this.stackEl.nativeElement.getBoundingClientRect().height);
      // console.log('Window height=', windowHeight, 'stack height=', stackHeight);
      this.hasScroll = stackHeight >= windowHeight;
    }, 200);

    if (!stack.length) { return this.close(); }

    // Find all those cards in the stack without any target (initial tree points), or target players
    const rootTargets: Set<string> = new Set(); // Array<gId | player1 | player2>
    const visitedTargets: Array<string> = [];
    const findEmptyTargets = (targets: Array<string>) => {
      targets.filter(target => visitedTargets.indexOf(target) < 0).forEach(target => {
        visitedTargets.push(target);
        if (target === 'player1' || target === 'player2') { rootTargets.add(target); }
        else { // target = gId
          const card = state.cards.find(c => c.gId === target);
          if (card) {
            if (card.targets.length) { findEmptyTargets(card.targets); }
            else { rootTargets.add(target); }
          }
        }
      });
    }    
    findEmptyTargets(stack.map(c => c.gId));
    

    // Function to check if a card is target of a card in the stack (at any level)
    const checkStackBranch = (target: TStackTree): boolean => {
      if (target.card?.location === 'stack') { return true };
      return !!target.targetOf.find(t => checkStackBranch(t));
    }

    // Construct the inverted tree with card.targetOf[] <---> card.target[]
    const expandTreeCard = (target: string): TStackTree => {
     
      // Select cards that are targetting the target
      const cardsTargetting = state.cards.filter(card => {
        if (card.isType('creature') && card.combatStatus) { return false; } // Omit defending creatures in combat (target = attacker)
        return card.targets.indexOf(target) >= 0;
      }).sort((a, b) => { // Cards that are not in the stack go first (left)
        if (a.location === 'stack' && b.location !== 'stack') { return 1; }
        if (a.location !== 'stack' && b.location === 'stack') { return -1; }
        return a.order > b.order ? 1 : -1;
      });
      
      const targetOf = cardsTargetting.map((card: TGameCard) => {
        return expandTreeCard(card.gId);
      }).filter(card => checkStackBranch(card)); // Only include targets that have a targeting card (at any level down) that is in the stack.

      if (target === 'player1' || target === 'player2') {
        const player = target === 'player1' ? state.player1 : state.player2;
        return { card: null, player, targetOf, shadow: { damage: 0, defense: 0, force: '', delta: '' }};

      } else {
        const card = state.cards.find(c => c.gId === target) || null;
        if (card) { card.hideOnStack = card.controller !== this.game.playerANum && !!cardsTargetting.find(c => c.hideTargetsOnStack); }
        return { card, player: null, targetOf, shadow: { damage: 0, defense: 0, force: '', delta: '' }};
      }
    }
    this.rootTargets = Array.from(rootTargets).sort((a,b) => a > b ? 1:-1).map((target: string) => expandTreeCard(target));


    // Fakely run the stack to figure out the shadow damage (the damage creatures and players will receive after the stack is executed)
    const fakeState = this.game.convertfromDBState(JSON.parse(JSON.stringify(state)));

    const fakeStack = fakeState.cards.filter(c => c.location === 'stack').sort((a, b) => a.order > b.order ? -1 : 1); // reverse order
    fakeStack.forEach(card => card.location === 'stack' && card.onSummon(fakeState));
    this.game.refreshEffects(fakeState);
    this.rootTargets.filter(i => !!i.card).forEach(item => {
      const fakeMatch = fakeState.cards.find(c => c.gId === item.card?.gId);
      if (fakeMatch && item.card) {
        item.shadow.damage = fakeMatch.turnDamage || 0;
        item.shadow.defense = fakeMatch.turnDefense;

        if (item.card.turnAttack !== fakeMatch.turnAttack || item.card.turnDefense !== fakeMatch.turnDefense) {
          item.shadow.force = `${fakeMatch.turnAttack}/${fakeMatch.turnDefense}`;
          const deltaA = fakeMatch.turnAttack - item.card.turnAttack;
          const deltaD = fakeMatch.turnDefense - item.card.turnDefense;
          if (deltaA !== 0 || deltaD !== 0) {
            item.shadow.delta = (deltaA > 0 ? '+' : '') + deltaA + '/' + (deltaD > 0 ? '+' : '') + deltaD;
          }
        }

        // If the creature is going to die, but it can be regenerated, add a fake action on the card
        // Clicking won't regenerate it automatically, but it will release the stack so the regeneration will start next
        if (item.card.isType('creature') && item.card.canRegenerate && item.shadow.defense <= item.shadow.damage) {
          item.card.selectableAction = { action: 'release-stack', params: {}, text: `Regenerate ${item.card.name}` };
        }
      }
    });
    this.rootTargets.filter(i => !!i.player).forEach(item => {
      if (item.player?.num === '1') { item.shadow.damage = state.player1.life - fakeState.player1.life; }
      if (item.player?.num === '2') { item.shadow.damage = state.player2.life - fakeState.player2.life; }
    });



    // this.rootTargets[0].targetOf.pop();
    // this.rootTargets[0].targetOf.pop();
    console.log('rootTargets', this.rootTargets);


    // Generate a human-readable list of the stack actions
    this.stackInfo = stack.map(card => {
      let txt = `Casting ${card.name}`;
      if (card.targets && card.targets.length) { 
        const targetId = card.targets[0];
        if      (targetId === 'player1') { txt = `${card.name} --> ${state.player1.name}`; }
        else if (targetId === 'player2') { txt = `${card.name} --> ${state.player2.name}`; }
        else {
          const target = state.cards.find(c => c.gId === targetId);
          if (target) { txt = `${card.name} --> ${target.name}`; }
        }        
      }
      return txt;
    });


    // Find a suitable title for the panel
    this.title = 'Casting Spells';
    if (this.rootTargets.length === 1) {
      const mainCard = stack.at(-1);
      if (mainCard) {
        if (mainCard.isType('creature'))     { this.title = `Summoning ${mainCard.name}`; }
        if (mainCard.isType('instant'))      { this.title = `Casting ${mainCard.name}`; }
        if (mainCard.isType('interruption')) { this.title = `Casting ${mainCard.name}`; }        
      }      
      if (mainCard?.targets && mainCard.targets.length === 1) {
        const target = mainCard.targets[0];
        if      (target === 'player1') { this.title += ` on ${state.player1.name}`; }
        else if (target === 'player2') { this.title += ` on ${state.player2.name}`; }
        else {
          const targetCard = state.cards.find(c => c.gId === target);
          if (targetCard) { this.title += ` on ${targetCard.name}`; }
        }
      }
    }

    // Find how many cards in horizontal line and vertical line are displayed in the spell tree, to resize the panel
    this.hCardsLen = this.rootTargets.length;
    this.vCardsLen = 1;
    const checkSize = (target: TStackTree, level = 1) => {
      if (this.vCardsLen < level) { this.vCardsLen = level; }
      if (this.hCardsLen < target.targetOf.length) { this.hCardsLen = target.targetOf.length; }
      target.targetOf.forEach(t => checkSize(t, level + 1));
    }
    this.rootTargets.forEach(target => checkSize(target));


    // Set a human-readable text to help the player understand what is going on
    if (this.youControl) {
      this.mainInfo = `You may cast more spells on this action.<br/>Or you may not, and go on.`;
    } else {
      this.mainInfo = `Wait for the opponent to cast any spells.`;
    }


    this.showTimer = this.youControl && state.lastAction?.player !== this.game.playerANum;
    if (this.showTimer) {
      console.log('Init auto Stack release timer. Last Action =', state.lastAction);
      this.initTimer(); // TODO: Uncomment this (with config flag)
    }
  }





  // Init the timer to automatically release the stack after a few seconds
  initTimer() {
    const ctrlTime = (new Date()).getTime();
    if (this.interval) { clearInterval(this.interval); }
    this.interval = setInterval(() => {
      this.progressBar = Math.min(100, ((new Date()).getTime() - ctrlTime) * 200 / this.TIMER_TIME);
      if (this.progressBar >= 100) { // Max reach
        clearInterval(this.interval); 
        this.showTimer = false;
        console.log('AUTO release stack');
        this.releaseStack();
      }
    }, 25);
  }

  pause() { // Stop the auto stack release
    clearInterval(this.interval);
    this.showTimer = false;
  }



  releaseStack() { // When you are done adding spells to the stack
    console.log('Ok, you are done adding spells to the stack.', 'control=', this.game.state.control, 'playerA=', this.game.playerANum);
    this.game.action('release-stack'); 
  }


  close() {
    if (this.stateSub) { this.stateSub.unsubscribe(); }
    if (this.interval) { clearInterval(this.interval); }
    this.win.spellStackDialog.close();
  }

}
