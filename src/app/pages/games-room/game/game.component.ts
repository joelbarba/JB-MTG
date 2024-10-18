import { Component, ViewEncapsulation } from '@angular/core';
import { AuthService } from '../../../core/common/auth.service';
import { ShellService } from '../../../shell/shell.service';
import { CommonModule } from '@angular/common';
import { BfConfirmService, BfDnDModule, BfDnDService, BfUiLibModule } from '@blueface_npm/bf-ui-lib';
import { GameStateService } from '../game-state.service';
import { filter, map } from 'rxjs';
import { EPhase, TGameState, TGameCard, TExtGameCard, TPlayer, TAction, TCast } from '../../../core/types';
import { ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { DialogSelectingManaComponent } from './dialog-selecting-mana/dialog-selecting-mana.component';
import { DialogSummonEventComponent } from './dialog-summon-event/dialog-summon-event.component';

export interface ICard {
  img: string;
  posX?: number;
  posY?: number;
  zInd?: number;
}


interface IDialog { type: 'xs' | 'sm' | 'md' | 'lg', title: string, text: string, icon?: string, background?: string, color?: string,
  buttons: Array<{ text: string, action: any }> }

export interface ISummonOp {
  status: 'off' | 'waitingMana' | 'selectingMana' | 'summoning', 
  gId: string, title: string, text: string, card?: TGameCard, showSummonBtn: boolean, minimized: boolean,
  cast: TCast, manaLeft: TCast, manaReserved: TCast, manaForUncolor: TCast,
  tryToSummon: () => void, reserveMana: (poolNum: number) => void, summonWithSelection: () => void, 
  turnOff: () => void, cancel: () => void
}

export type TPanel =
  'selecting-mana'
| 'selecting-discard'
| 'summon-event'
| 'opponent-summon-event';


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
    DialogSummonEventComponent,
  ],
  templateUrl: './game.component.html',
  styleUrls: ['./game.component.scss'],
  encapsulation: ViewEncapsulation.None,
})
export class GameComponent {
  fullCardImg = 'taiga.jpg';
  cardActionHelp = '';  // Current help message for the hovering card
  isHandBExp = true;  // Whether the hand box B is expanded
  isHandAExp = true;  // Whether the hand box A is expanded
  subs: Array<any> = []; // subscriptions to unsubscribe
  positions: { [key: string]: { posX: number, posY: number, zInd: number } } = {};  // Extended info for the cards (its position on the table)

  // ----- Game State Snapshots --------
  state!: TGameState;
  phase: string = '';
  handA: Array<TGameCard> = [];
  handB: Array<TGameCard> = [];
  tableA: Array<TExtGameCard> = [];
  tableB: Array<TExtGameCard> = [];
  playerA !: TPlayer;
  playerB !: TPlayer;
  deckACount = 60;
  deckBCount = 60;

  canIDraw = false;
  skipPhase = {
    skip: () => this.game.action('skip-phase'),
    enabled: false,
    help: 'Move on to the next phase',
    whyNot: `You can't move to the next pahse yet. You need to complete it first`,
  };

  panel: null | TPanel = null;
  dialog: null | IDialog = null;

  mainInfo = '';  // General info for the state
  itemInfo = '';  // Info about a specific item (card, button, ...)

  constructor(
    private route: ActivatedRoute,
    public auth: AuthService,
    public shell: ShellService,
    public bfDnD: BfDnDService,
    public game: GameStateService,
    public router: Router,
    public bfConfirm: BfConfirmService,
  ) {
    this.shell.showMenu = false;
  }

  async ngOnInit() {
    const gameId = this.route.snapshot.params['gameId'];
    console.log('Entering Game ID', gameId);
    await this.game.activateGame(gameId);

    this.subs.push(this.game.state$.subscribe(state => { // React on state changes
      this.mainInfo = '';
      this.itemInfo = '';

      // console.log('New State:', state);
      console.log('Options', state.options.map(o => `${o.action}:${o.gId || ''}`));
      this.state = state;
      this.calcStateChanges(this.game.prevState, state);

      // Threat Special statuses - status: 'created' | 'playing' | 'player1win' | 'player2win' | 'error';
      if (state.status === 'error') { console.error('STATUS ERROR'); }
      if (state.status === 'player1win') { this.goBack(state.status); }
      if (state.status === 'player2win') { this.goBack(state.status); }
      if (state.status === 'created' && state.turn === this.game.playerANum) { // Automatically start the game
        console.log('Starting the game');
        this.game.action('start-game');
      }

      this.phase = `${this.game.getTurnPlayerLetter()}.${state.phase}`;

      this.handA = state.cards.filter(c => c.location === this.game.yourHand()).sort((a, b) => a.order > b.order ? 1 : -1);
      this.handB = state.cards.filter(c => c.location === this.game.otherHand()).sort((a, b) => a.order > b.order ? 1 : -1);

      this.tableA = state.cards.filter(c => c.location === this.game.yourTable()).sort((a, b) => a.order > b.order ? 1 : -1).map(c => this.extendTableCard(c));
      this.tableB = state.cards.filter(c => c.location === this.game.otherTable()).sort((a, b) => a.order > b.order ? 1 : -1).map(c => this.extendTableCard(c));

      this.deckACount = state.cards.filter(c => c.location === this.game.yourDeck()).length;
      this.deckBCount = state.cards.filter(c => c.location === this.game.otherDeck()).length;

      this.playerA = this.game.getPlayers(state).playerA;
      this.playerB = this.game.getPlayers(state).playerB;


      this.setVarsFromStateChange();
      this.triggerDialogs();
      this.autoAdvance();
    }));
  }

  ngOnDestroy() {
    this.subs.forEach(sub => sub.unsubscribe());
  }



  setVarsFromStateChange() {
    const you = this.game.playerANum;
    const yourOptions = this.state.options.filter(op => op.player === this.game.playerANum);

    this.canIDraw = !!yourOptions.find(op => op.action === 'draw');

    this.skipPhase.enabled = !!yourOptions.find(op => op.action === 'skip-phase');
    if (!this.skipPhase.enabled) { this.skipPhase.whyNot = `You can't move to the next pahse yet. You need to complete it first`; }

    if (this.canIDraw && !this.skipPhase.enabled) {
      this.mainInfo = `Draw Phase`;
      this.skipPhase.whyNot = `You must draw a card from your deck`;
    }
    // if (state.turn === '1' && state.options.find(o => o.action === 'draw'))
  }

  autoAdvance() {
    if (!this.game.isYourTurn()) { return; }
    const yourOptions = this.state.options.filter(op => op.player === this.game.playerANum);

    const advancePhase = () => setTimeout(() => { console.log('Auto advancing phase', this.state.phase); this.skipPhase.skip(); }, 500);

    // If you can only skip phase, do it
    if (yourOptions.length === 1 && yourOptions[0].action === 'skip-phase') { return advancePhase(); }

    // Don't stop at the untap pahse if there are no cards to untap
    if (this.state.phase === 'untap' && !yourOptions.find(o => o.action === 'untap-card')) { return advancePhase(); }

    // Always skip maintenance (for now)
    if (this.state.phase === 'maintenance') { return advancePhase(); }

    // Don't stop at the draw pahse if you can't draw more cards
    if (this.state.phase === 'draw' && !yourOptions.find(o => o.action === 'draw')) { return advancePhase(); }

    // Don't stop at the combat phase if you don't have creatures to attack
    const combatCreatures = this.tableA.filter(c => c.type === 'creature' && !c.summonStatus && !c.isTapped);
    if (this.state.phase === 'combat' && combatCreatures.length === 0) { return advancePhase(); }

    // Don't stop at the discard phase, if you don't have to discard
    if (this.state.phase === 'discard' && !yourOptions.find(o => o.action === 'select-card-to-discard')) { return advancePhase(); }

    // Don't stop at the end phase if you don't have mana to burn
    if (this.state.phase === 'end' && !yourOptions.find(o => o.action === 'burn-mana')) { return advancePhase(); }
    return;    
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
    this.bfConfirm.open(modalConf).then(_ => this.router.navigate(['game']));
  }



  hoverHandCard(card: TGameCard) { this.hoverCard(card); }
  hoverTableCard(card: TGameCard) { this.hoverCard(card); }
  hoverCard(card: TGameCard) {
    this.fullCardImg = card.image;
    if (card.selectableAction) {
      this.itemInfo = card.selectableAction.text; 
    } else {
      this.itemInfo = '';
    }
  }
  clearHover() {
    this.itemInfo = '';
  }


  isHandCardSelectable(card: TGameCard): boolean {
    if (card.selectableAction) { return true; }
    // if (card.type === 'creature' && (this.state.phase === EPhase.pre || this.state.phase === EPhase.post)) { return true; }
    return false;
  }

  displayManaPool(poolPlayer: string, poolNum: number): number {
    let mana = poolPlayer === 'A' ? this.playerA.manaPool[poolNum] : this.playerB.manaPool[poolNum];
    if (this.summonOp.status === 'selectingMana') { mana -= this.summonOp.manaReserved[poolNum]; } // If reserved for summoning, substract it
    return mana;
  }

  extendTableCard(card: TGameCard): TExtGameCard {
    const extInfo = this.positions[card.gId];
    if (extInfo) { return { ...card, ...extInfo }; }
    this.positions[card.gId] = this.defaultCardPos(card); // Find the position on the table for the first time
    return { ...card, ...this.positions[card.gId] };
  }

  defaultCardPos(card: TGameCard | TExtGameCard) {
    if (card.location === 'tble' + this.game.playerANum) {
      return { posX: 20 + (card.order * 135), posY: 20, zInd: 100 + card.order };  // Your card (table A)
    } else {
      return { posX: 20 + (card.order * 135), posY: 300, zInd: 100 + card.order }; // Opponent's card (B)
    }
  }

  autoPositionGameCards(table: 'A' | 'B' = 'A') {
    if (table === 'A') {
      this.tableA = this.tableA.map(card => ({ ...card, ...this.defaultCardPos(card) }));
      this.tableA.forEach(({ gId, posX, posY, zInd }) => { this.positions[gId] = { posX, posY, zInd }; })
    } else {
      this.tableB = this.tableB.map(card => ({ ...card, ...this.defaultCardPos(card) }));
      this.tableB.forEach(({ gId, posX, posY, zInd }) => { this.positions[gId] = { posX, posY, zInd }; })
    }
  }


  movingCard: { card: TExtGameCard, height: number, width: number } | null = null;
  dragStart(ev: any, card: TExtGameCard) {
    this.movingCard = {
      card,
      width: ev.srcElement.width,
      height: ev.srcElement.height
    };
  }

  moveCardPosition(ev: any) {
    if (this.movingCard) {
      ev.bfDraggable.posX = Math.round(ev.position.x - (this.movingCard.width / 2) - 8);
      ev.bfDraggable.posY = Math.round(ev.position.y - (this.movingCard.height / 2) - 7);
      const card = this.movingCard.card;
      this.positions[card.gId].posX = card.posX;
      this.positions[card.gId].posY = card.posY;
      this.focusPlayCard(card);
      this.movingCard = null;
    }
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
      this.dialog = {
        type: 'sm',
        title: 'Mana burn',
        icon: 'icon-fire',
        background: 'crimson',
        color: 'white',
        text: 'There is unspent mana in your mana pool. It deals 1 damage point for each',
        buttons: [
          { text: 'Ok, burn it', action: () => this.game.action('burn-mana') }
        ]
      };
    }

    // if (state.options.find(op => op.action === 'skip-phase')) {
    //   return { type: 'small', title: '', text: '', buttons: [{ text: 'Next Phase', action: 'skip-phase' }] };
    // }

    this.updateSummonOperation();
    if (this.summonOp.status === 'selectingMana') {
      // this.dialog = {
      //   type: 'medium',
      //   title: this.summonOp.title,
      //   text: this.summonOp.text,
      //   icon: 'icon-fire',
      //   // background: 'crimson',
      //   // color: 'white',
      //   buttons: [
      //     { text: 'Cancel', action: 'burn-mana' }
      //   ]
      // };
    }
  }


  // -------------------------- Summon Operation --------------------------

  // On state change, detect and update the status of a summon operation
  updateSummonOperation() {

    // If you tried to summon but there is not enough mana, start a summonOp waiting for the necessary mana
    const waitingCard = this.handA.find(c => c.summonStatus === 'waitingMana');
    if (waitingCard && (this.summonOp.status === 'off' || this.summonOp.gId !== waitingCard.gId)) {
      this.startSummonOp(waitingCard, 'waitingMana'); // start new summon op
    } 
    
    // If an ongoing waiting mana operation, try to use the current mana pool
    if (this.summonOp.status === 'waitingMana') { this.summonOp.tryToSummon(); }

    // If you tried to summon but a cherry picking is needed for the uncolored mana, do it
    const selectingCard = this.handA.find(c => c.summonStatus === 'selectingMana');
    if (selectingCard && (this.summonOp.status === 'off' || this.summonOp.gId !== selectingCard.gId)) {
      this.startSummonOp(selectingCard, 'selectingMana'); // start new summon op
    }

    // If you successfuly summoned, trigger the summon event panel
    const summoningCard = this.handA.find(c => c.summonStatus === 'summoning');
    if (summoningCard && (this.summonOp.status === 'off' || this.summonOp.gId !== summoningCard.gId)) {
      this.startSummonOp(summoningCard, 'summoning'); // start new summon op
    }

    // Cancel operations no longer needed
    if (!waitingCard && !selectingCard && !summoningCard && this.summonOp.status !== 'off') { this.summonOp.turnOff(); }

    if (this.summonOp) { this.mainInfo = this.summonOp.text; }
  }

  

  summonOp: ISummonOp = { status: 'off', gId: '', title: '', text: '', showSummonBtn: false, minimized: false,
    cast: [0, 0, 0, 0, 0, 0] as TCast,
    manaLeft: [0, 0, 0, 0, 0, 0] as TCast,
    manaReserved: [0, 0, 0, 0, 0, 0] as TCast,
    manaForUncolor: [0, 0, 0, 0, 0, 0] as TCast,
    tryToSummon: () => {},
    reserveMana: (poolNum: number) => {}, summonWithSelection: () => {}, turnOff: () => {}, cancel: () => {}};

  startSummonOp(card: TGameCard, status: 'off' | 'waitingMana' | 'selectingMana' | 'summoning') {
    this.summonOp = {
      status,
      gId: card.gId,
      card,
      title: `Summoning ${card.name}`,
      text: '',
      minimized: false,
      cast: [...card.cast],
      manaLeft: [...card.cast],       // Remaining mana left to summon
      manaReserved: [0,0,0,0,0,0],    // Mana temporarily reserved to summon
      manaForUncolor: [0,0,0,0,0,0],  // What mana pools should be used for the uncolored mana to summon the card
      showSummonBtn: false,
      reserveMana: (poolNum: number) => {
        if (this.summonOp.manaLeft[poolNum] > 0) { // Use it as colored mana
          this.summonOp.manaLeft[poolNum] -= 1;
          this.summonOp.manaReserved[poolNum] += 1;
        }
        else if (this.summonOp.manaLeft[0] > 0)  { // Use it as uncolored mana
          this.summonOp.manaLeft[0] -= 1;
          this.summonOp.manaReserved[poolNum] += 1;
          this.summonOp.manaForUncolor[poolNum] += 1;          
        }
        // else { return; } // Unusable (can't reserve more mana than needed)
        this.summonOp.showSummonBtn = this.summonOp.manaLeft.reduce((v,a) => v + a, 0) <= 0;
      },
      tryToSummon: () => {
        const manaStatus = this.game.checkMana(card.cast, this.playerA.manaPool);
        if (manaStatus === 'exact' || manaStatus === 'auto') {
          this.summonOp.turnOff();
          this.game.action('summon-creature', { gId: card.gId });
        }
        else if (manaStatus === 'not enough') { console.log('Still not enough mana'); }
        else if (manaStatus === 'manual') {
          console.log('Ops, too much mana of different colors. You need to select');
          this.startSummonOp(card, 'selectingMana'); // start new summon op as selecting
        }
      },
      summonWithSelection: () => {
        const reserveStatus = this.game.checkMana(card.cast, this.summonOp.manaReserved);
        if (reserveStatus === 'exact') {
          this.summonOp.turnOff();
          this.game.action('summon-creature', { gId: card.gId, manaForUncolor: this.summonOp.manaForUncolor });          
        }
      },
      cancel: () => {
        this.summonOp.turnOff();
        this.game.action('cancel-summon-creature');
      },
      turnOff: () => {
        this.summonOp.status = 'off';
        this.panel = null;
      }
    };

    if (status === 'waitingMana') {
      this.summonOp.text = `You need to generate enough mana to summon ${card.name}`;

    } else if (status === 'selectingMana') {
      this.summonOp.text = `Please select the mana from your mana pool you want to use to summon ${card.name}`;
      this.panel = 'selecting-mana';
      // Automatically reserve colored mana
      for (let t = 0; t < Math.min(this.playerA.manaPool[1], card.cast[1]); t++) { this.summonOp.reserveMana(1); }
      for (let t = 0; t < Math.min(this.playerA.manaPool[2], card.cast[2]); t++) { this.summonOp.reserveMana(2); }
      for (let t = 0; t < Math.min(this.playerA.manaPool[3], card.cast[3]); t++) { this.summonOp.reserveMana(3); }
      for (let t = 0; t < Math.min(this.playerA.manaPool[4], card.cast[4]); t++) { this.summonOp.reserveMana(4); }
      for (let t = 0; t < Math.min(this.playerA.manaPool[5], card.cast[5]); t++) { this.summonOp.reserveMana(5); }

    } else if (status === 'summoning') {
      this.summonOp.text = `Waiting for effects on the summoning event`;
      this.panel = 'summon-event';
    }
    this.mainInfo = this.summonOp.text;
    this.itemInfo = this.summonOp.text;
  }

  

  stateChanges: Array<{ field: string, value: any, prev: any }> = [];
  calcStateChanges(prevState: TGameState, state: TGameState) {
    this.stateChanges = [];
    if (!prevState) { return; }
    state.player1.manaPool.forEach((value, i) => {
      const prev = prevState.player1.manaPool[i];
      if (prev !== value) { this.stateChanges.push({ field: 'player1.manaPool.' + i, value, prev }); }
    });
  }





  // -------------------------- Actions --------------------------



  drawCard() {
    if (this.canIDraw) { this.game.action('draw'); }
  }

  selectCardFromYourHand(card: TGameCard) {
    if (card.selectableAction) {
      // if (card.selectableAction.action === 'summon-creature') {
      this.game.action(card.selectableAction.action, { gId: card.gId });
    }
  }

  selectManaPool(fromPlayer: 'A' | 'B', poolNum: number) {
    if (this.summonOp.status === 'selectingMana' && this.playerA.manaPool[poolNum] > 0) { this.summonOp.reserveMana(poolNum); }
  }



  selectCardFromYourTable(card: TExtGameCard) {
    this.focusPlayCard(card);
    if (card.selectableAction) {
      this.game.action(card.selectableAction.action, { gId: card.gId });
    }
  }


}
