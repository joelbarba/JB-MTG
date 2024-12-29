import { asNativeElements, Component, ElementRef, ViewChild, ViewEncapsulation } from '@angular/core';
import { AuthService } from '../../../core/common/auth.service';
import { ShellService } from '../../../shell/shell.service';
import { CommonModule } from '@angular/common';
import { BfConfirmService, BfDnDModule, BfDnDService, BfGrowlService, BfUiLibModule } from 'bf-ui-lib';
import { GameStateService } from '../game-state.service';
import { filter, map, Subscription, timeout } from 'rxjs';
import { EPhase, TGameState, TGameCard, TExtGameCard, TPlayer, TAction, TCast, TActionParams, ESubPhase, TCardLocation } from '../../../core/types';
import { ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { DialogSelectingManaComponent } from './dialog-selecting-mana/dialog-selecting-mana.component';
import { PanelGraveyardComponent } from './panel-graveyard/panel-graveyard.component';
import { DialogCombatComponent } from './dialog-combat/dialog-combat.component';
import { DialogSpellStackComponent } from './dialog-spell-stack/dialog-spell-stack.component';
import { HoverTipDirective } from '../../../core/common/internal-lib/bf-tooltip/bf-tooltip.directive';
import { PanelEffectsComponent } from './panel-effects/panel-effects.component';
import { ManaArrayComponent } from './mana-array/mana-array.component';
import { GamePanelComponent } from "./game-panel/game-panel.component";
import { GameCardComponent } from "./game-card/game-card.component";
import { BfTooltipService } from '../../../core/common/internal-lib/bf-tooltip/bf-tooltip.service';
import { BlackLotusDialogComponent } from "./specific-dialogs/black-lotus/black-lotus-dialog.component";
import { DualLandDialogComponent } from "./specific-dialogs/dual-land/dual-land-dialog.component";
import { DialogRegenerateComponent } from './dialog-regenerate/dialog-regenerate.component';
import { CardOpService } from './cardOp.service';
import { DialogSelectingExtraManaComponent} from "./dialog-selecting-extra-mana/dialog-selecting-extra-mana.component";

export interface ICard {
  img: string;
  posX?: number;
  posY?: number;
  zInd?: number;
}


interface IDialog { type: 'xs' | 'sm' | 'md' | 'lg', title: string, text: string, icon?: string, background?: string, color?: string,
  buttons: Array<{ text: string, class: string; action: any }> }



@Component({
  selector: 'app-game',
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
    DialogSelectingExtraManaComponent,
],
  templateUrl: './game.component.html',
  styleUrls: ['./game.component.scss'],
  encapsulation: ViewEncapsulation.None,
})
export class GameComponent {
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

  dialog: null | IDialog = null;  

  mainInfo = '';  // General info for the state
  itemInfo = '';  // Info about a specific item (card, button, ...)

  @ViewChild('fullCardEl', { read: ElementRef, static: false }) fullCardEl!: ElementRef;

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
    public cardOp: CardOpService,
  ) {
    this.shell.gameMode('on');
  }

  async ngOnInit() {
    const gameId = this.route.snapshot.params['gameId'];
    console.log('Entering Game ID', gameId);
    await this.game.activateGame(gameId);

    this.subs.push(this.game.hoverCard$.subscribe(hoveringCard => {
      if (hoveringCard) {
        this.fullCard.img = hoveringCard.image;
        this.fullCard.border = hoveringCard.border || 'white';
        // this.itemInfo = hoveringCard.selectableAction?.text || '';
      } else {
        // this.itemInfo = '';
      }
    }));
    this.subs.push(this.game.effectsBadge$.subscribe(item => {
      this.effectsPanelCard = item.card;
      if (item.ev) { item.ev.stopPropagation(); }
    }));




    this.subs.push(this.game.state$.subscribe(state => { // React on state changes
      this.stateTime = new Date();
      this.mainInfo = '';
      this.itemInfo = '';
      this.globalButtons = [];
      this.tooltipService.flush();

      // console.log('New State:', state);      
      this.state = state;
      // this.calcStateChanges(this.game.prevState, state);

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

      this.setVarsFromStateChange();
      this.showToastMesssages();
      this.triggerDialogs();
      
      this.cardOp.update();
      if (this.cardOp.status !== 'off') {
        if (this.game.doYouHaveControl() && this.cardOp.card?.controller === this.game.playerANum) {
          this.mainInfo = this.cardOp.text;
        }
      }

      this.autoAdvance();
      this.autoPositionGameCards();
    }));
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





  // Debugging tools
  debugLocations: Array<TCardLocation> = ['stack', 'deck1', 'deck2', 'hand1', 'hand2', 'tble1', 'tble2', 'grav1', 'grav2', 'discarded'];
  cardFilter(location: TCardLocation) { return this.state.cards.filter(c => c.location === location); }
  debugCard(card: TGameCard) { console.log(card.name, card); }

  setVarsFromStateChange() {
    const yourOptions = this.game.doYouHaveControl() ? this.state.options : [];

    this.skipPhase.enabled = !!yourOptions.find(op => op.action === 'skip-phase');
    this.canIDraw = !!yourOptions.find(op => op.action === 'draw');

    if (!this.skipPhase.enabled) { this.skipPhase.whyNot = `You can't move to the next phase yet. You need to complete it first`; }

    if (this.canIDraw && !this.skipPhase.enabled) {
      this.mainInfo = `Draw Phase`;
      this.skipPhase.whyNot = `You must draw a card from your deck`;
    }

    if (this.game.doYouHaveControl() && this.state.phase === 'discard' && this.handA.length > 7) {
      this.mainInfo = `You cannot have more than 7 cards on your hand. Please discard`;
    }

    // If untap phase, show the global button to untapp all tapped
    const untapOp = yourOptions.find(op => op.action === 'untap-all');
    if (untapOp) {
      const clickFn = () => this.game.action(untapOp.action, untapOp.params);
      this.globalButtons.push({ id: 'untap-all', text: 'Untap All', icon: 'icon-undo2', clickFn });
    }

    // If cancel operation
    const cancelSummonOp = yourOptions.find(op => op.action === 'cancel-op');
    if (cancelSummonOp) {
      this.globalButtons.push({
        id: 'cancel-op', text: cancelSummonOp.text || 'Cancel',
        icon: 'icon-cross', clickFn: () => this.cardOp.cancel() 
      });
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

        if (lastAction.action === 'summon-land')     { toast(`<b>${playerB.name}</b> summoned a ${cardName}`,               'icon-arrow-down16'); }
        if (lastAction.action === 'summon-creature') { toast(`<b>${playerB.name}</b> is summoning a creature: ${cardName}`, 'icon-arrow-down16'); }
        if (lastAction.action === 'summon-spell')    { toast(`<b>${playerB.name}</b> is casting a ${cardName}`,             'icon-arrow-down16'); }
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
          // console.log('Auto advancing phase', this.state.phase);
          action();
        }
      }, 100);
    }

    // if (this.state.phase === 'combat') { return; } // For now, avoid autoadvance during combat

    // If you can only skip phase, do it
    if (options.length === 1 && options[0].action === 'skip-phase') { return advancePhase(); }

    // Automatically untap
    if (this.state.phase === 'untap' && options.filter(o => o.action === 'untap-all').length === 1) { return advancePhase(() => this.game.action('untap-all')); }

    // Don't stop at the untap pahse if there are no cards to untap
    if (this.state.phase === 'untap' && !options.find(o => o.action === 'untap-card')) { return advancePhase(); }

    // Always skip maintenance (for now)
    if (this.state.phase === 'maintenance') { return advancePhase(); }

    // Automatically draw if you can only draw 1 card
    if (this.state.phase === 'draw' && options.filter(o => o.action === 'draw').length === 1) { return advancePhase(() => this.game.action('draw')); }

    // Automatically skip draw if you can't draw more cards
    if (this.state.phase === 'draw' && !options.find(o => o.action === 'draw')) { return advancePhase(); }

    if (this.state.phase === 'combat') {
      const selectableAttackingCreatures = !!options.find(o => o.action === 'select-attacking-creature');
      const attackingCreatures = !!this.tableA.find(c => c.combatStatus === 'combat:attacking');
      const selectableDefendingCreatures = !!options.find(o => o.action === 'select-defending-creature');
      const defendingCreatures = !!this.tableA.find(c => c.combatStatus === 'combat:defending');

      // Don't stop at the combat phase if you don't have creatures to attack
      if (this.state.subPhase === 'selectAttack' && !selectableAttackingCreatures && !attackingCreatures) { return advancePhase(); }
      
      // Don't stop at the select defense if there are no creatures to select for the defense
      if (this.state.subPhase === 'selectDefense' && !selectableDefendingCreatures && !defendingCreatures) { return advancePhase(() => this.game.action('submit-defense')); }

      if (this.state.subPhase === 'attacking' || this.state.subPhase === 'defending') {
        if (!options.find(o => {
          if (o.action === 'summon-spell') { return true; }
          if (o.action === 'trigger-ability') {
            const card = this.state.cards.find(c => c.gId === o.params.gId);
            if (card && card.isType('creature')) { return true; }
          }
          return false;
        })) {
          console.log('You have no instants/interruptions or abilities to play, so autoadvance');
          // return advancePhase(() => this.game.action('release-stack'));
        }
      }

    } 

    // Don't stop at the discard phase, if you don't have to discard
    if (this.state.phase === 'discard' && !options.find(o => o.action === 'select-card-to-discard')) { return advancePhase(); }

    // Don't stop at the end phase if you don't have mana to burn
    if (this.state.phase === 'end' && !options.find(o => o.action === 'burn-mana')) { return advancePhase(); }
    return;    
  }



  isHandCardSelectable(card: TGameCard): boolean {
    if (card.selectableAction) { return true; }
    if (card.selectableTarget) { return true; }
    return false;
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


  displayTableA: Array<TExtGameCard> = [];  // tableA + playing cards from B that target cards from tableA
  displayTableB: Array<TExtGameCard> = [];  // tableB + playing cards from A that target cards from tableB
  autoPositionGameCards() {
    // if (table === 'A') {
    //   this.tableA = this.tableA.map(card => ({ ...card, ...this.defaultCardPos(card) }));
    //   this.tableA.forEach(({ gId, posX, posY, zInd }) => { this.positions[gId] = { posX, posY, zInd }; })
    // } else {
    //   this.tableB = this.tableB.map(card => ({ ...card, ...this.defaultCardPos(card) }));
    //   this.tableB.forEach(({ gId, posX, posY, zInd }) => { this.positions[gId] = { posX, posY, zInd }; })
    // }

    // Order cards in a grid of columns: Lands + Creatures + Others
    const positionTable = (tableCards: Array<TExtGameCard>) => {
      const tableGrid: Array<Array<TExtGameCard>> = [];
  
      const lands     = tableCards.filter(c => c.isType('land')).sort((a,b) => a.order > b.order ? 1: -1);
      const creatures = tableCards.filter(c => c.isType('creature')).sort((a,b) => a.order > b.order ? 1: -1);
      const others    = tableCards.filter(c => !c.isType('land') && !c.isType('creature')).sort((a,b) => a.order > b.order ? 1: -1);
  
      const groupLand = tableCards.length > 8;
      const groupCretures = tableCards.length > 16;
      const groupOthers = tableCards.length > 20;
  
      lands.forEach(card => {
        const col = tableGrid.find(col => col.find(c => c.id === card.id));
        if (groupLand && col) { col.push(card); } else { tableGrid.push([card]); }
      });
      creatures.forEach(card => {
        const col = tableGrid.find(col => col.find(c => c.id === card.id));
        if (groupCretures && col) { col.push(card); } else { tableGrid.push([card]); }
      });
      others.forEach(card => {
        const col = tableGrid.find(col => col.find(c => c.id === card.id));
        if (groupOthers && col) { col.push(card); } else { tableGrid.push([card]); }
      });
      return tableGrid;
    };

    // Those cards that have only 1 target should be placed right before that target
    // If the target belongs to the opponent, move it to the opponent's grid
    const repositionCardsWithOneTarget = (tableCards: Array<TExtGameCard>, tableGrid: Array<Array<TExtGameCard>>) => {
      const oneTarget = tableCards.filter(c => c.targets.length === 1).sort((a,b) => a.order > b.order ? 1: -1);
  
      oneTarget.forEach(card => { // Find cards with 1 target, and reposition them right before their target
        const targetId = card.targets[0];
        const targetA = this.tableA.find(t => t.gId === targetId);
        const targetB = this.tableB.find(t => t.gId === targetId);
        if (targetA && card.grid === 'B') { card.grid = 'A'; } // Changing grid (opponent's targeting one of your cards)
        if (targetB && card.grid === 'A') { card.grid = 'B'; } // Changing grid (you targeting one of opponent's cards)
        const targetGrid = targetA ? tableGridA : targetB ? tableGridB : null;
        if (targetGrid) {
          let cCol = -1, cInd = -1; // Card position in its grid
          let tCol = -1, tInd = -1; // Target position in its grid
          tableGrid.forEach((arr, col) => arr.forEach((c, ind) => { if (c.gId === card.gId) { cCol = col; cInd = ind; } }));
          targetGrid.forEach((arr, col) => arr.forEach((c, ind) => { if (c.gId === targetId) { tCol = col; tInd = ind; } }));
          if (cCol >= 0 && cInd >= 0) { tableGrid[cCol].splice(cInd, 1); } // Remove it from the original position
          if (tCol >= 0 && tInd >= 0) { targetGrid[tCol].splice(tInd, 0, card); } // Add it to the target column, right before the target 
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

    let cardWidth = 121, cardHeight = 170, gap = 15; // 150 * 0.81, 210 * 0.81
    if (this.windowHeight <= 1050) { cardWidth = 97; cardHeight = 136; gap = 12; }
    if (this.windowHeight <= 900)  { cardWidth = 81; cardHeight = 113; gap = 10; }

    // Once the grid is constructed, give coordinates to every card
    tableGridA.filter(c => !!c.length).forEach((arr, col) => {
      arr.forEach((card, ind) => {
        card.posX = 20 + (col * (cardWidth + gap));
        card.posY = 20 + (ind * gap * 2);
        card.zInd = 100 + ind;
      })
    });
    tableGridB.filter(c => !!c.length).forEach((arr, col) => {
      arr.forEach((card, ind) => {
        card.posX = 20 + (col * (cardWidth + gap));
        card.posY = (cardHeight * 1.6) + (ind * gap * 2);
        card.zInd = 100 + (col * 15) + ind;
      })
    });
  }


  // Recalculate the z-index so the card gets on top of all others
  focusPlayCard(card: TExtGameCard) {
    const currentZInd = card.zInd || 0;
    this.tableA.filter(c => c.zInd > currentZInd).forEach(c => c.zInd--);
    card.zInd = 100 + this.tableA.length - 1;
    this.positions[card.gId].zInd = card.zInd;
  }








  // -------------------------- Dialogs --------------------------


  triggerDialogs() {
    this.dialog = null;

    // Mana Burn dialog
    if (this.state.options.find(op => op.action === 'burn-mana')) {
      const totalMana = this.game.playerA().manaPool.reduce((a, v) => a + v, 0);
      this.dialog = {
        type: 'sm',
        title: 'Mana burn',
        icon: 'icon-fire',
        background: 'crimson',
        color: 'white',
        text: `There is ${totalMana} unspent mana into your mana pool.<br/> It deals ${totalMana} damage to you`,
        buttons: [
          { text: 'Ok, burn it', class: 'quaternary', action: () => this.game.action('burn-mana') }
        ]
      };
    }

    // this.updateSummonOperation();
    this.updateCombatOperation();
    this.updateSpellStack();
    this.updateCustomDialogs();

    // If a creature that can be regenerated is dying, open the regenerate dialog
    this.regenerateCreature = this.state.cards.find(c => c.canRegenerate && c.isDying);
  }

  regenerateCreature?:TGameCard;

  
  combatPanel = false;
  combatPanelAttacker: 'A' | 'B' = 'A';
  combatPanelSize: 'min' | 'max' = 'max';

  // On state change, detect and update the status of a combat operation
  updateCombatOperation() {
    this.combatPanel = false;

    if (this.state.phase === 'combat') {
      
      // If you have attacking creatures (you are leading an attack)
      const attackingCreatures = this.tableA.find(c => c.combatStatus === 'combat:attacking');
      if (attackingCreatures) {
        this.combatPanel = true;
        this.combatPanelAttacker = 'A';
        if (this.game.state.subPhase === 'selectAttack')  { this.mainInfo = 'Selecting creatures to attack'; }
        if (this.game.state.subPhase === 'selectDefense') { this.mainInfo = 'Waiting for the opponent to select a defense'; }
      }
  
      // If the opponent is attacking you
      const opponentAttack = this.tableB.find(c => c.combatStatus === 'combat:attacking');
      const defendingCreatures = this.tableA.find(c => c.combatStatus === 'combat:defending');
      if (opponentAttack || defendingCreatures) {
        this.combatPanel = true;
        this.combatPanelAttacker = 'B';
        if (this.game.state.subPhase === 'selectAttack')  { this.mainInfo = 'Waiting for the opponent to attack'; }
        if (this.game.state.subPhase === 'selectDefense') { this.mainInfo = 'Selecting creatures to defend'; }
      }
    }

  }


  spellStackPanel = false;
  spellStackPanelSize: 'min' | 'max' = 'max';
  updateSpellStack() {    
    const anySpellsInTheStack = !!this.state.cards.find(c => c.location === 'stack');
    this.spellStackPanel = anySpellsInTheStack && (this.state.player1.stackCall || this.state.player2.stackCall);

    if (this.youControl && this.spellStackPanel && this.cardOp?.card?.controller === this.game.playerANum) {
      // If summoning a card and waiting for mana, minimize it (so the lands on the table get visible)
      if (this.cardOp?.status === 'waitingMana')   { this.spellStackPanelSize = 'min'; }
      if (this.cardOp?.status === 'selectingMana') { this.spellStackPanelSize = 'min'; }
  
      // If summoning a card and selecting a target, maximize it because its' most likely one on the stack
      if (this.cardOp?.status === 'selectingTargets') { this.spellStackPanelSize = 'max'; }
    }
  }

  graveyardPanel: 'A' | 'B' | null = null;
  effectsPanelCard: TGameCard | null = null;


  // Check cards that need custom dialogs to be opened
  customDialogs: { [key:string]: TGameCard } = {};
  updateCustomDialogs() {
    this.customDialogs = {};
    if (this.state.control === this.game.playerANum) {
      this.state.cards.forEach(card => {
        if (card.customDialog) { this.customDialogs[card.customDialog] = card; }
      });
    }
  }


  displayManaPool(poolPlayer: string, poolNum: number): number {
    let mana = poolPlayer === 'A' ? this.playerA.manaPool[poolNum] : this.playerB.manaPool[poolNum];
    if (this.cardOp.status !== 'off' && poolPlayer === this.cardOp.playerLetter) {
      mana = this.cardOp.displayManaPool[poolNum];
      // if (mana < 0) { mana = 0; }
    }
    return mana;
  }

  // -------------------------- Actions --------------------------



  drawCard() {
    if (this.canIDraw) { this.game.action('draw'); }
  }

  selectManaPool(fromPlayer: 'A' | 'B', poolNum: number) {
    if (this.cardOp.status === 'selectingMana' && this.playerA.manaPool[poolNum] > 0) { this.cardOp.reserveMana(poolNum); }
    if (this.cardOp.status === 'waitingExtraMana' && this.playerA.manaPool[poolNum] > 0) { this.cardOp.reserveExtraMana(poolNum); }
  }

  selectCardFromYourHand(card: TGameCard) {
    if (card.selectableAction) {
      this.game.action(card.selectableAction.action, { gId: card.gId });
    }
  }



  selectCardFromTable(card: TExtGameCard) {
    this.focusPlayCard(card);
    this.selectCard(card);
  }

  selectCard(card: TGameCard) {
    if (card.selectableTarget) {
      if (this.cardOp.status === 'selectingTargets') {
        this.cardOp.addTarget(card.selectableTarget.value);        
      }
    }
    if (card.selectableAction) {
      this.game.action(card.selectableAction.action, card.selectableAction.params);
    }
  }

  selectPlayer(player: TPlayer) {
    if (player.selectableTarget) {
      if (this.cardOp.status === 'selectingTargets') {
        this.cardOp.addTarget(player.selectableTarget.value);
      }
    }
  }


}
