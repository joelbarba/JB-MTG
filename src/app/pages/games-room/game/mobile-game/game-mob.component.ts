import { asNativeElements, Component, ElementRef, ViewChild, ViewEncapsulation } from '@angular/core';
import { AuthService } from '../../../../core/common/auth.service';
import { ShellService } from '../../../../shell/shell.service';
import { CommonModule } from '@angular/common';
import { BfConfirmService, BfDnDModule, BfDnDService, BfGrowlService, BfUiLibModule } from 'bf-ui-lib';
import { GameStateService } from '../gameLogic/game-state.service';
import { filter, map, Subscription, timeout } from 'rxjs';
import { EPhase, TGameState, TGameCard, TExtGameCard, TPlayer, TAction, TCast, TActionParams, ESubPhase, TCardLocation } from '../../../../core/types';
import { ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { DialogSelectingManaComponent } from '../dialog-selecting-mana/dialog-selecting-mana.component';
import { PanelGraveyardComponent } from '../panel-graveyard/panel-graveyard.component';
import { DialogCombatComponent } from '../dialog-combat/dialog-combat.component';
import { DialogSpellStackComponent } from '../dialog-spell-stack/dialog-spell-stack.component';
import { HoverTipDirective } from '../../../../core/common/internal-lib/bf-tooltip/bf-tooltip.directive';
import { PanelEffectsComponent } from '../panel-effects/panel-effects.component';
import { ManaArrayComponent } from '../mana-array/mana-array.component';
import { GamePanelComponent } from "../game-panel/game-panel.component";
import { GameCardComponent } from "../game-card/game-card.component";
import { BfTooltipService } from '../../../../core/common/internal-lib/bf-tooltip/bf-tooltip.service';
import { BlackLotusDialogComponent } from "../custom-dialogs/black-lotus/black-lotus-dialog.component";
import { DualLandDialogComponent } from "../custom-dialogs/dual-land/dual-land-dialog.component";
import { DialogRegenerateComponent } from '../dialog-regenerate/dialog-regenerate.component';
import { DialogExtraManaComponent} from "../dialog-extra-mana/dialog-extra-mana.component";
import { CardOpServiceNew } from '../gameLogic/cardOp.service';
import { WindowsService } from '../gameLogic/windows.service';
import { GameCardEventsService } from '../gameLogic/game-card-events.service';
import { DialogDamageComponent } from "../dialog-damage/dialog-damage.component";
import { DialogUpkeepComponent } from '../dialog-upkeep/dialog-upkeep.component';
import { ErhnamDjinnDialogComponent } from '../custom-dialogs/erhnam-djinn/erhnam-djinn-dialog.component';
import { BirdsOfParadiseDialogComponent } from '../custom-dialogs/birds-of-paradise/birds-of-paradise-dialog.component';
import { DemonicTutorDialogComponent } from '../custom-dialogs/demonic-tutor/demonic-tutor-dialog.component';
import { RaiseDeadDialogComponent } from '../custom-dialogs/raise-dead/raise-dead-dialog.component';
import { RegrowthDialogComponent } from '../custom-dialogs/regrowth/regrowth-dialog.component';
import { AnimateDeadDialogComponent } from '../custom-dialogs/animate-dead/animate-dead-dialog.component';
import { LibraryOfAlexandriaDialogComponent } from '../custom-dialogs/library-of-alexandria/library-of-alexandria-dialog.component';
import { ReconstructionDialogComponent } from "../custom-dialogs/reconstruction/reconstruction-dialog.component";
import { mobileCheck } from '../../../../core/common/commons';

type TTableGrid = {
  lands     :Array<Array<TExtGameCard>>;
  others    :Array<Array<TExtGameCard>>;
  creatures :Array<Array<TExtGameCard>>;
};


@Component({
  selector: 'app-game-mob',
  standalone: true,
  imports: [
    CommonModule,
    BfDnDModule,
    TranslateModule,
    FormsModule,
    BfUiLibModule,
    DialogSelectingManaComponent,
    DialogCombatComponent,
    DialogSpellStackComponent,
    PanelGraveyardComponent,
    PanelEffectsComponent,
    HoverTipDirective,
    ManaArrayComponent,
    GamePanelComponent,
    GameCardComponent,
    BlackLotusDialogComponent,
    DualLandDialogComponent,
    DialogRegenerateComponent,
    DialogExtraManaComponent,
    DialogDamageComponent,
    DialogUpkeepComponent,
    ErhnamDjinnDialogComponent,
    BirdsOfParadiseDialogComponent,
    DemonicTutorDialogComponent,
    RaiseDeadDialogComponent,
    RegrowthDialogComponent,
    AnimateDeadDialogComponent,
    LibraryOfAlexandriaDialogComponent,
    ReconstructionDialogComponent
],
  templateUrl: './game-mob.component.html',
  styleUrls: ['./game-mob.component.scss'],
  encapsulation: ViewEncapsulation.None,
})
export class GameMobComponent {
  mainPanel: 'A' | 'B' = 'A';
  prevTurn = '';

  fullCard = {
    img: 'taiga.jpg',
    border: 'white',
    borderWidth  : 12,
    borderRadius : 12,
    prevHeight   : 0,
  }
  cardActionHelp = '';  // Current help message for the hovering card
  isHandBExp = true;  // Whether the hand box B is expanded
  isHandAExp = true;  // Whether the hand box A is expanded
  subs: Array<Subscription> = []; // subscriptions to unsubscribe
  positions: { [key: string]: { posX: number, posY: number, zInd: number } } = {};  // Extended info for the cards (its position on the table)
  stateTime = new Date();
  windowHeight = 0;
  tableWidth = 0; // Total pixels from left to right where cards are placed
  tableHeight = 0; // windowHeight / 2

  // ----- Game State Snapshots --------
  state!: TGameState;
  phase: string = '';
  handA: Array<TGameCard> = [];
  handB: Array<TGameCard> = [];
  tableA: Array<TExtGameCard> = [];
  tableB: Array<TExtGameCard> = [];
  topGravA!: TGameCard | null;
  topGravB!: TGameCard | null;
  playerA !: TPlayer;
  playerB !: TPlayer;
  deckACount = 60;
  deckBCount = 60;

  canIDraw = false;
  youControl = false;

  skipPhase = {
    skip: () => this.game.action('skip-phase'),
    enabled: false,
    help: 'Move on to the next phase',
    whyNot: `You can't move to the next pahse yet. You need to complete it first`,
  };

  globalButtons: Array<{ id: string, text: string, icon: string, clickFn: () => void }> = [];


  mainInfo = '';  // General info for the state
  opInfo = '';    // Info about the current operation
  itemInfo = '';  // Info about a specific item (card, button, ...)
  expandedTalbe: 'A' | 'B' | null = null;

  @ViewChild('fullCardEl', { read: ElementRef, static: false }) fullCardEl!: ElementRef;
  @ViewChild('tableADiv', { read: ElementRef, static: false }) tableADiv!: ElementRef;

  constructor(
    private route: ActivatedRoute,
    public auth: AuthService,
    public shell: ShellService,
    public bfDnD: BfDnDService,
    public game: GameStateService,
    public router: Router,
    public bfConfirm: BfConfirmService,
    public growl: BfGrowlService,
    private hostElement: ElementRef,
    private tooltipService: BfTooltipService,
    public cardOp: CardOpServiceNew,
    public cardEv: GameCardEventsService,
    public win: WindowsService,
  ) {
    this.shell.gameMode('on');
  }

  async ngOnInit() {
    const gameId = this.route.snapshot.params['gameId'];
    console.log('Entering Game ID', gameId);

    // if (!mobileCheck()) { window.location.href = '/game/' + gameId; return; } // If not mobile

    await this.game.activateGame(gameId);

    this.subs.push(this.cardEv.hoverCard$.subscribe(hoveringCard => {
      if (hoveringCard) {
        this.fullCard.img = hoveringCard.image;
        this.fullCard.border = hoveringCard.border || 'white';
        // this.itemInfo = hoveringCard.selectableAction?.text || '';
      } else {
        // this.itemInfo = '';
      }
    }));




    this.subs.push(this.game.state$.subscribe(state => { // React on state changes
      this.stateTime = new Date();
      this.mainInfo = '';
      this.itemInfo = '';
      this.globalButtons = [];
      this.tooltipService.flush();      

      // console.log('New State:', state);      
      this.state = state;

      // Threat Special statuses - status: 'created' | 'playing' | 'player1win' | 'player2win' | 'error';
      if (state.status === 'error') { console.error('STATUS ERROR'); }
      if (state.status === 'player1win') { this.goBack(state.status); }
      if (state.status === 'player2win') { this.goBack(state.status); }
      if (state.status === 'created' && state.turn === this.game.playerANum) { // Automatically start the game
        console.log('Starting the game');
        this.game.action('start-game');
      }

      this.phase = `${this.game.getTurnPlayerLetter()}.${state.phase}`;
      this.youControl = this.game.playerANum === state.control;

      const gCards = this.game.getCards(state);
      const gPlayers = this.game.getPlayers(state);

      this.handA = gCards.handA;
      this.handB = gCards.handB;

      this.tableA = gCards.tableA.map(c => this.extendTableCard(c, 'A'));
      this.tableB = gCards.tableB.map(c => this.extendTableCard(c, 'B'));

      this.deckACount = gCards.deckA.length;
      this.deckBCount = gCards.deckB.length;
      
      this.playerA = gPlayers.playerA;
      this.playerB = gPlayers.playerB;

      this.topGravA = gCards.graveyardA.at(-1) || null;
      this.topGravB = gCards.graveyardB.at(-1) || null;
      

      this.cardOp.onStateUpdate(state);
      // if (this.cardOp.status) { this.mainInfo = this.cardOp.text; }

      this.win.updateWindows();
      this.updateCombatOperation();
      this.setVarsFromStateChange();
      this.showToastMesssages();
      this.autoAdvance();
      this.autoPositionGameCards(true);

      const turn = state.turn === this.game.playerANum ? 'A' : 'B';
      if (this.prevTurn !== turn) { // changing turn
        this.mainPanel = turn;
        this.prevTurn = turn;
      }
    }));



    // When card operation updates
    this.cardOp.onUpdate = () => {
      this.opInfo = '';

      // If an ongoing operation, show its status info
      if (this.cardOp.status) {
        const cardName = this.cardOp.card?.name || '';
        if (this.cardOp.status === 'waitingMana')      { 
          if (this.cardOp.action === 'summon-spell')    { this.opInfo = `To summon ${cardName} you still need:`; }
          if (this.cardOp.action === 'trigger-ability') { this.opInfo = `To use ${cardName} you still need:`; }
          if (this.cardOp.action === 'pay-upkeep')      { this.opInfo = `To pay ${cardName}'s upkeep you still need:`; }
        }
        if (this.cardOp.status === 'waitingExtraMana') { this.opInfo = `Add extra mana for ${cardName}`; }
        if (this.cardOp.status === 'selectingMana')    { this.opInfo = `Select the mana from your mana pool you want to use for ${cardName}`; }
        if (this.cardOp.status === 'selectingTargets') { this.opInfo = `Select target for ${cardName}`; }
      }

      this.updateCombatOperation();
      this.win.updateWindows();
    }

  }


  ngOnDestroy() {
    this.game.deactivateGame();
    this.subs.forEach(sub => sub.unsubscribe());
  }


  ngAfterViewChecked() {
    const height = this.hostElement.nativeElement.getBoundingClientRect().height;
    if (height && height !== this.windowHeight) {
      this.windowHeight = height;      
      localStorage.setItem('windowHeight', this.windowHeight + '');
    }
    this.calcFullCardSize();
    if (this.tableADiv) { 
      const tableWidth = this.tableADiv.nativeElement.getBoundingClientRect().width; 
      if (tableWidth !== this.tableWidth) { 
        this.tableWidth = tableWidth;
        setTimeout(() => this.autoPositionGameCards());        
      }
    }
  }

  ngAfterViewInit() {
    this.windowHeight = this.hostElement.nativeElement.getBoundingClientRect().height;
    if (!this.windowHeight) { this.windowHeight = Number.parseInt(localStorage.getItem('windowHeight') || '0', 10); }
  }

  calcFullCardSize() {
    if (this.fullCardEl) {
      const cardHeight = this.fullCardEl.nativeElement.getBoundingClientRect().height;
      if (Math.abs(this.fullCard.prevHeight - cardHeight) > 30) {
        // console.log('Full Card Height', cardHeight, this.fullCard.prevHeight);
        this.fullCard.prevHeight = cardHeight;
        setTimeout(() => {
          this.fullCard.borderWidth  = Math.max(1, cardHeight * 0.0215);
          this.fullCard.borderRadius = Math.max(1, cardHeight * 0.0275);
        });
      }
    }
  }


  goBack(reason: string) {
    const modalConf = {
      title: 'Game Over', 
      htmlContent: `Congratulations! You won this game.`, 
      showCancel: false, 
      showNo: false, 
      yesButtonText: 'view.common.ok' 
    };
    if (reason === 'player1win' && this.game.playerANum === '2') { modalConf.htmlContent = `Sorry, you lost this game.`; }
    if (reason === 'player2win' && this.game.playerANum === '1') { modalConf.htmlContent = `Sorry, you lost this game.`; }
    modalConf.htmlContent += `<br/><br/>Go back to play more games`;
    this.bfConfirm.open(modalConf).then(_ => {
      this.game.deactivateGame();
      this.router.navigate(['game']);
    });
  }







  setVarsFromStateChange() {
    const youControl = this.game.doYouHaveControl();
    const yourOptions = youControl ? this.state.options : [];

    this.skipPhase.enabled = !!yourOptions.find(op => op.action === 'skip-phase');
    this.canIDraw = !!yourOptions.find(op => op.action === 'draw');

    if (!this.skipPhase.enabled) { this.skipPhase.whyNot = `You can't move to the next phase yet. You need to complete it first`; }

    if (this.canIDraw && !this.skipPhase.enabled) {
      this.mainInfo = `Draw Phase`;
      this.skipPhase.whyNot = `You must draw a card from your deck`;
    }

    if (youControl && this.state.phase === 'discard' && this.handA.length > 7) {
      this.mainInfo = `You cannot have more than 7 cards on your hand. Please discard`;
    }
    
    if (youControl && this.state.phase === 'upkeep' && this.game.state.cards.filter(c => c.waitingUpkeep).length) {
      this.mainInfo = `You must pay your cards upkeep`;
    }

    // If untap phase, show the global button to untapp all tapped
    const untapOp = yourOptions.find(op => op.action === 'untap-all');
    if (untapOp) {
      const clickFn = () => this.game.action(untapOp.action, untapOp.params);
      this.globalButtons.push({ id: 'untap-all', text: 'Untap All', icon: 'icon-undo2', clickFn });
    }

  }

  showToastMesssages() {
    const toast = (text: string, msgIcon?: string) => {
      this.growl.pushMsg({ text, timeOut: 2000, msgType: 'success', msgIcon });
    }

    const lastAction = this.state.lastAction;
    if (lastAction) {
      // console.log('LAST ACTION', lastAction);
      const playerA = this.game.playerA();
      const playerB = this.game.playerB();
      const card = this.state.cards.find(c => c.gId === lastAction.params?.gId);
      const cardName = `<br/><b>${card?.name || ''}</b>`;
      
      if (lastAction.player !== this.game.playerANum) { // Actions from opponent
        if (lastAction.action === 'summon-land')     { toast(`<b>${playerB.name}</b> summoned a ${cardName}`,   'icon-arrow-down16'); }
        if (lastAction.action === 'summon-spell')    { toast(`<b>${playerB.name}</b> is casting a ${cardName}`, 'icon-arrow-down16'); }
        if (lastAction.action === 'submit-attack')   { toast(`<b>${playerB.name}</b> is attacking you`, 'icon-sword'); }
        if (lastAction.action === 'submit-defense')  { toast(`<b>${playerB.name}</b> is defending`, 'icon-sword'); }
      }
    }
  }

  autoAdvanceTimeout: any;
  autoAdvance() {
    if (this.autoAdvanceTimeout) { clearTimeout(this.autoAdvanceTimeout); }
    if (!this.game.doYouHaveControl()) { return; }
    const options = this.state.options;

    const advancePhase = (action = this.skipPhase.skip) => {
      const lastStateTime = this.stateTime;
      this.autoAdvanceTimeout = setTimeout(() => {
        if (lastStateTime === this.stateTime) {
          console.log('Auto advancing phase', this.state.phase);
          action();
        }
      }, 100);
    }

    // if (this.state.phase === 'combat') { return; } // For now, avoid autoadvance during combat

    // If you can only skip phase, do it
    if (options.length === 1 && options[0].action === 'skip-phase') {
      if (this.state.phase !== 'pre' && this.state.phase !== 'post') { return advancePhase(); }
    }

    // Automatically untap
    if (this.state.phase === 'untap' && options.filter(o => o.action === 'untap-all').length === 1) { return advancePhase(() => this.game.action('untap-all')); }

    // Don't stop at the untap pahse if there are no cards to untap
    if (this.state.phase === 'untap' && !options.find(o => o.action === 'untap-card')) { return advancePhase(); }

    // Automatically draw if you can only draw 1 card
    if (this.state.phase === 'draw' && options.filter(o => o.action === 'draw').length === 1) { return advancePhase(() => this.game.action('draw')); }

    // Automatically skip draw if you can't draw more cards
    // if (this.state.phase === 'draw' && !options.find(o => o.action === 'draw')) { return advancePhase(); }

    if (this.state.phase === 'combat') {
      const attackingCreatures = !!this.tableA.find(c => c.combatStatus === 'combat:attacking');
      const defendingCreatures = !!this.tableA.find(c => c.combatStatus === 'combat:defending');
      const selectableAttackingCreatures = !!this.tableA.find(c => c.canAttack(this.game.state));
      const selectableDefendingCreatures = !!this.tableA.find(c => c.canDefend(this.game.state) && c.targetBlockers(this.game.state).length);
      const youDefend = !attackingCreatures; // Whether you are defending (true) or atacking (false)


      // Don't stop at the combat phase if you don't have creatures to attack
      if (this.state.subPhase === 'selectAttack' && !selectableAttackingCreatures) { return advancePhase(); }
      
      // If none of your creatures can defend the attack, don't stop at the select defense subphase
      if (this.state.subPhase === 'selectDefense' && youDefend && !selectableDefendingCreatures) { 
        return advancePhase(() => this.game.action('submit-defense'));
      }

      // If you defend, and have no defending creatures, don't stop at the defender "defending" spells phase
      if (this.state.subPhase === 'beforeDamage' && youDefend && !defendingCreatures) {
        return advancePhase(() => this.game.action('continue-combat'));
      }

      // If you have no spells to play, or no creatures to trigger abilities, skip the sub-phase
      // if (this.state.subPhase === 'attacking' || this.state.subPhase === 'beforeDamage') {
      //   if (!options.find(o => {
      //     if (o.action === 'summon-spell') { return true; }
      //     if (o.action === 'trigger-ability') {
      //       const card = this.state.cards.find(c => c.gId === o.params.gId);
      //       if (card && card.isType('creature')) { return true; }
      //     }
      //     return false;
      //   })) {
      //     console.log('You have no instants/interruptions or abilities to play, so autoadvance');
      //     return advancePhase(() => this.game.action('continue-combat'));
      //   }
      // }

    } 

    // Don't stop at the discard phase, if you don't have to discard
    if (this.state.phase === 'discard' && !options.find(o => o.action === 'select-card-to-discard')) { return advancePhase(); }

    return;    
  }








  displayTableA: Array<TExtGameCard> = [];  // tableA + playing cards from B that target cards from tableA
  displayTableB: Array<TExtGameCard> = [];  // tableB + playing cards from A that target cards from tableB
  autoPositionGameCards(autocollapseHandB = false) {

    const gridLoc = (card: TGameCard) => {
      if (card.isType('land')) { return 'land'; }
      if (card.isType('creature')) { return 'creature'; }
      return 'other';
    }

    // Order cards in a grid of columns: Lands + Creatures + Others
    const positionTable = (tableCards: Array<TExtGameCard>) => {
      const tableGrid: TTableGrid = {
        lands     : [] as Array<Array<TExtGameCard>>,
        others    : [] as Array<Array<TExtGameCard>>,
        creatures : [] as Array<Array<TExtGameCard>>,
      };
  
      const lands     = tableCards.filter(c => gridLoc(c) === 'land'     ).sort((a,b) => a.order > b.order ? 1: -1);
      const creatures = tableCards.filter(c => gridLoc(c) === 'creature' ).sort((a,b) => a.order > b.order ? 1: -1);
      const others    = tableCards.filter(c => gridLoc(c) === 'other'    ).sort((a,b) => a.order > b.order ? 1: -1);

      const cardsToGroup = (card1: TGameCard, card2: TGameCard) => {
        if (card1.id !== card2.id) { return false; }
        const eff1 = (card1.effectsFrom || []).sort((a,b) => a.id > b.id ? 1 : -1).map(e => e.id).join(',');
        const eff2 = (card2.effectsFrom || []).sort((a,b) => a.id > b.id ? 1 : -1).map(e => e.id).join(',');
        if (eff1 !== eff2) { return false; } // If they have different effects, don't group them
        return true; // Same card id, same effects => group them
      }

      const maxCardsPerRow = 4;
  
      lands.forEach(card => {
        const col = tableGrid.lands.find(col => col.find(c => cardsToGroup(c, card)));
        if (col && col.length < maxCardsPerRow) { col.push(card); } else { tableGrid.lands.push([card]); }
      });
      creatures.forEach(card => {
        const col = tableGrid.creatures.find(col => col.find(c => cardsToGroup(c, card)));
        if (col && col.length < maxCardsPerRow) { col.push(card); } else { tableGrid.creatures.push([card]); }
      });
      others.forEach(card => {
        const col = tableGrid.others.find(col => col.find(c => cardsToGroup(c, card)));
        if (col && col.length < maxCardsPerRow) { col.push(card); } else { tableGrid.others.push([card]); }
      });
      return tableGrid;
    };

    // Enchantments that have only 1 target should be placed right before that target
    // If the target belongs to the opponent, move it to the opponent's grid
    const repositionCardsWithOneTarget = (tableCards: Array<TExtGameCard>, tableGrid: TTableGrid) => {
      const oneTarget = tableCards.filter(c => c.isType('enchantment') && c.targets.length === 1).sort((a,b) => a.order > b.order ? 1: -1);
  
      oneTarget.forEach(card => { // Find cards with 1 target, and reposition them right before their target
        const targetId = card.targets[0];
        const targetA = this.tableA.find(t => t.gId === targetId);
        const targetB = this.tableB.find(t => t.gId === targetId);
        if (targetA && card.grid === 'B') { card.grid = 'A'; } // Changing grid (opponent's targeting one of your cards)
        if (targetB && card.grid === 'A') { card.grid = 'B'; } // Changing grid (you targeting one of opponent's cards)
        const target = targetA || targetB;
        const tGridObj = targetA ? tableGridA : targetB ? tableGridB : null;
        if (target && tGridObj) {
          // Remove card from the original position in the grid
          let cCol = -1, cInd = -1; // Card position in its grid          
          const cardGrid = gridLoc(card) === 'land' ? tableGrid.lands : gridLoc(card) === 'creature' ? tableGrid.creatures : tableGrid.others;
          cardGrid.forEach((arr, col) => arr.forEach((c, ind) => { if (c.gId === card.gId) { cCol = col; cInd = ind; } }));
          if (cCol >= 0 && cInd >= 0) { cardGrid[cCol].splice(cInd, 1); } 
          
          // Add it to the target column, right before the target 
          let tCol = -1, tInd = -1; // Target position in its grid
          const targetGrid = gridLoc(target) === 'land' ? tGridObj.lands : gridLoc(target) === 'creature' ? tGridObj.creatures : tGridObj.others;          
          targetGrid.forEach((arr, col) => arr.forEach((c, ind) => { if (c.gId === targetId) { tCol = col; tInd = ind; } }));
          if (tCol >= 0 && tInd >= 0) { targetGrid[tCol].splice(tInd, 0, card); } 
        }
      });
    };

    this.tableA.forEach(c => c.grid === 'A');
    this.tableB.forEach(c => c.grid === 'B');
    const tableGridA = positionTable(this.tableA);
    const tableGridB = positionTable(this.tableB);
    repositionCardsWithOneTarget(this.tableA, tableGridA);
    repositionCardsWithOneTarget(this.tableB, tableGridB);

    const allTableCards = this.tableA.concat(this.tableB);
    this.displayTableA = allTableCards.filter(c => c.grid === 'A');
    this.displayTableB = allTableCards.filter(c => c.grid === 'B');

    let cardWidth = 121, cardHeight = 170, gap = 15, handHeight = 230; // large screen
    if (this.windowHeight <= 1050) { cardWidth = 97; cardHeight = 136; gap = 12, handHeight = 190; } // medium
    if (this.windowHeight <= 900)  { cardWidth = 81; cardHeight = 113; gap = 10, handHeight = 157; } // small

    // If there is room only for 2 rows
    if (this.windowHeight <= 620) {
      tableGridA.others = [...tableGridA.others, ...tableGridA.creatures];
      tableGridB.others = [...tableGridB.others, ...tableGridB.creatures];
      tableGridA.creatures = [];
      tableGridB.creatures = [];
    }


    // let maxCardsPerRow = 2;
    // if (!this.tableWidth) { maxCardsPerRow = 10; }

    const maxGroupedLandsA = tableGridA.lands.reduce((a,v) => Math.max(v.length, a), 1); // Maxim number of grouped cards
    const maxGroupedOthersA = tableGridA.others.reduce((a,v) => Math.max(v.length, a), 1); // Maxim number of grouped cards
    const maxGroupedCreaturesA = tableGridA.creatures.reduce((a,v) => Math.max(v.length, a), 1); // Maxim number of grouped cards

    const totalLands = tableGridA.lands.filter(c => !!c.length).length;
    const totalOthers = tableGridA.others.filter(c => !!c.length).length;
    const totalCreatures = tableGridA.creatures.filter(c => !!c.length).length;

    const landsRowTop = totalLands === 0 ? 0 : this.windowHeight - 70 - handHeight - cardHeight - (maxGroupedLandsA * gap);
    const othersRowTop = totalOthers === 0 ? landsRowTop : landsRowTop - gap - cardHeight - (maxGroupedOthersA * gap);
    const creaturesRowTop = othersRowTop - gap - cardHeight - (maxGroupedCreaturesA * gap);

    // Once the grid is constructed, give coordinates to every card
    tableGridA.lands.filter(c => !!c.length).forEach((arr, col) => {
      arr.forEach((card, ind) => {
        card.posX = 50 + (col * (cardWidth + gap));
        card.posY = landsRowTop + (ind * gap * 2);
        card.zInd = 100 + ind;
      })
    });
    tableGridA.others.filter(c => !!c.length).forEach((arr, col) => {
      arr.forEach((card, ind) => {
        card.posX = 50 + (col * (cardWidth + gap));
        card.posY = othersRowTop + (ind * gap * 2);
        card.zInd = 100 + ind;
      })
    });
    tableGridA.creatures.filter(c => !!c.length).forEach((arr, col) => {
      arr.forEach((card, ind) => {
        card.posX = 50 + (col * (cardWidth + gap));
        card.posY = creaturesRowTop + (ind * gap * 2);
        card.zInd = 100 + ind;
      })
    });


    const maxGroupedLandsB = tableGridB.lands.reduce((a,v) => Math.max(v.length, a), 1); // Maxim number of grouped cards
    const maxGroupedOthersB = tableGridB.others.reduce((a,v) => Math.max(v.length, a), 1); // Maxim number of grouped cards
    const maxGroupedCreaturesB = tableGridB.creatures.reduce((a,v) => Math.max(v.length, a), 1); // Maxim number of grouped cards

    const totalLandsB = tableGridB.lands.filter(c => !!c.length).length;
    const totalOthersB = tableGridB.others.filter(c => !!c.length).length;

    const landsRowTopB = 20;
    const othersRowTopB = totalOthersB === 0 ? landsRowTopB : landsRowTopB + cardHeight + (maxGroupedLandsB * gap * 2);
    const creaturesRowTopB = othersRowTopB + cardHeight + (maxGroupedOthersB * gap * 2);

    // Once the grid is constructed, give coordinates to every card
    tableGridB.lands.filter(c => !!c.length).forEach((arr, col) => {
      arr.forEach((card, ind) => {
        card.posX = 50 + (col * (cardWidth + gap));
        card.posY = landsRowTopB + (ind * gap * 2);
        card.zInd = 100 + ind;
      })
    });
    tableGridB.others.filter(c => !!c.length).forEach((arr, col) => {
      arr.forEach((card, ind) => {
        card.posX = 50 + (col * (cardWidth + gap));
        card.posY = othersRowTopB + (ind * gap * 2);
        card.zInd = 100 + ind;
      })
    });
    tableGridB.creatures.filter(c => !!c.length).forEach((arr, col) => {
      arr.forEach((card, ind) => {
        card.posX = 50 + (col * (cardWidth + gap));
        card.posY = creaturesRowTopB + (ind * gap * 2);
        card.zInd = 100 + ind;
      })
    });

  }



  extendTableCard(card: TGameCard, grid: 'A'| 'B'): TExtGameCard {
    const extInfo = this.positions[card.gId];
    if (extInfo) { return { ...card, ...extInfo, grid }; }
    this.positions[card.gId] = this.defaultCardPos(card); // Find the position on the table for the first time
    return { ...card, ...this.positions[card.gId], grid };
  }

  defaultCardPos(card: TGameCard | TExtGameCard) {
    const x = card.order % 15;
    const y = Math.floor(card.order / 15);
    if (card.location === 'tble' + this.game.playerANum) {
      return { posX: 20 + (x * 135), posY: 20 + (y * 180), zInd: 100 + card.order };  // Your card (table A)
    } else {
      return { posX: 20 + (x * 135), posY: 230 + (y * 180), zInd: 100 + card.order }; // Opponent's card (B)
    }
  }

  // Recalculate the z-index so the card gets on top of all others
  focusPlayCard(card: TExtGameCard) {
    const currentZInd = card.zInd || 0;
    this.tableA.filter(c => c.zInd > currentZInd).forEach(c => c.zInd--);
    card.zInd = 100 + this.tableA.length - 1;
    this.positions[card.gId].zInd = card.zInd;
  }







  // On state change, detect and update the status of a combat operation
  updateCombatOperation() {
    if (this.state.phase === 'combat') {
      
      // If you have attacking creatures (you are leading an attack)
      const attackingCreatures = this.tableA.find(c => c.combatStatus === 'combat:attacking');
      if (attackingCreatures) {
        // this.win.combatDialog.open('A');
        if (this.game.state.subPhase === 'selectAttack')  { this.mainInfo = 'Selecting creatures to attack'; }
        if (this.game.state.subPhase === 'selectDefense') { this.mainInfo = 'Waiting for the opponent to select a defense'; }
      }
  
      // If the opponent is attacking you
      const opponentAttack = this.tableB.find(c => c.combatStatus === 'combat:attacking');
      const defendingCreatures = this.tableA.find(c => c.combatStatus === 'combat:defending');
      if (opponentAttack || defendingCreatures) {
        // this.win.combatDialog.open('B');
        if (this.game.state.subPhase === 'selectAttack')  { this.mainInfo = 'Waiting for the opponent to attack'; }
        if (this.game.state.subPhase === 'selectDefense') { this.mainInfo = 'Selecting creatures to defend'; }
      }

    } else {
      this.win.combatDialog.close();
    }
  }

  private swipeTime = 0;
  private yIni = 0;
  swipe($event: TouchEvent, when: 'start' | 'end', player: 'A' | 'B') {
    const y = $event.changedTouches[0].clientY;
    const time = new Date().getTime();
  
    if (when === 'start') {
      this.yIni = $event.changedTouches[0].clientY;
      this.swipeTime = time;

    } else { // end
      const duration = time - this.swipeTime;
      if (duration < 800) {
        // console.log('this.yIni - y = ', this.yIni - y, duration);
        if (this.yIni - y > 50)  {
          console.log('swiping up');
          if (player === 'B') { this.mainPanel = 'A'; }
        }
        if (this.yIni - y < -50)  {
          console.log('swiping down');
          if (player === 'A') { this.mainPanel = 'B'; }
        }
      }
    }
  }


  // -------------------------- Actions --------------------------



  drawCard() {
    if (this.canIDraw) { this.game.action('draw'); }
  }

  selectManaPool(fromPlayer: 'A' | 'B', poolNum: number) {
    this.cardOp.selectMana(poolNum);
  }

  selectCardFromYourHand(card: TGameCard) {
    this.cardEv.selectCard(card);
  }

  selectCardFromTable(card: TExtGameCard) {
    this.focusPlayCard(card);
    this.cardEv.selectCard(card);
  }

  selectPlayer(num: '1' | '2') {
    return this.cardOp.selectTargetPlayer(num);
  }

  isPlayerSelectable(num: '1' | '2') { 
    return this.cardOp.isTargetPlayer(num); 
  }



  // Debugging tools
  debugLocations: Array<TCardLocation> = ['stack', 'deck1', 'deck2', 'hand1', 'hand2', 'tble1', 'tble2', 'grav1', 'grav2', 'discarded'];
  cardFilter(location: TCardLocation) { return this.state.cards.filter(c => c.location === location).sort((a, b) => a.order > b.order ? 1 : -1); }
  debugCard(card: TGameCard) { console.log(card.name, card); }
}
