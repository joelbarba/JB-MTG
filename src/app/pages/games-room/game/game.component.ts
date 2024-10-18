import { Component, ViewEncapsulation } from '@angular/core';
import { AuthService } from '../../../core/common/auth.service';
import { ShellService } from '../../../shell/shell.service';
import { CommonModule } from '@angular/common';
import { BfConfirmService, BfDnDModule, BfDnDService } from '@blueface_npm/bf-ui-lib';
import { GameStateService } from '../game-state.service';
import { filter, map } from 'rxjs';
import { EPhase, TGameState, TGameCard, TExtGameCard } from '../../../core/types';
import { ActivatedRoute, Router } from '@angular/router';

export interface ICard {
  img: string;
  posX?: number;
  posY?: number;
  zInd?: number;
}

@Component({
  selector: 'app-game',
  standalone: true,
  imports: [
    CommonModule,
    BfDnDModule,
  ],
  templateUrl: './game.component.html',
  styleUrl: './game.component.scss',
  encapsulation: ViewEncapsulation.None,
})
export class GameComponent {

  fullCardImg = 'taiga.jpg';
  info = ''; // Current info message

  // handA$ = this.game.cards$.pipe(map(cards => cards.filter(c => c.location === this.game.yourHand()).sort((a, b) => a.order > b.order ? 1 : -1)));
  // handB$ = this.game.cards$.pipe(map(cards => cards.filter(c => c.location === this.game.otherHand()).sort((a, b) => a.order > b.order ? 1 : -1)));
  // tableA$ = this.game.cards$.pipe(map(cards => cards.filter(c => c.location === this.game.yourTable()).sort((a, b) => a.order > b.order ? 1 : -1)));
  // tableB$ = this.game.cards$.pipe(map(cards => cards.filter(c => c.location === this.game.otherTable()).sort((a, b) => a.order > b.order ? 1 : -1)));

  // phase$ = this.game.game$.pipe(map(g => {
  //   const playerLetter = g.currentPlayer === this.game.playerANum ? 'A' : 'B';
  //   return `${playerLetter}.${g.phase}`;
  // }));

  isHandBExp = true;  // Whether the hand box B is expanded
  isHandAExp = true;  // Whether the hand box A is expanded
  subs: Array<any> = []; // subscriptions to unsubscribe

  // Extended info for the cards (its position on the table)
  positions: { [key: string]: { posX: number, posY: number, zInd: number } } = {};


  // ----- Game State Snapshots --------
  state!: TGameState;
  phase: string = '';
  handA: Array<TGameCard> = [];
  handB: Array<TGameCard> = [];
  tableA: Array<TExtGameCard> = [];
  tableB: Array<TExtGameCard> = [];
  canIDraw = false;
  deckACount = 60;
  deckBCount = 60;

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

      console.log('New State:', state);
      this.state = state;

      // Threat Special statuses - status: 'created' | 'playing' | 'player1win' | 'player2win' | 'error';
      if (state.status === 'error') { console.error('STATUS ERROR'); }
      if (state.status === 'player1win') { this.goBack(state.status); }
      if (state.status === 'player2win') { this.goBack(state.status); }
      if (state.status === 'created' && state.currentPlayerNum === this.game.playerANum) { // Automatically start the game
        console.log('Starting the game');
        this.game.action('start-game');
      }

      const you = this.game.playerANum;
      const currentPlayerLetter = state.currentPlayerNum === you ? 'A' : 'B';

      this.canIDraw = !!state.options.find(op => op.player === you && op.action === 'draw');

      this.phase = `${currentPlayerLetter}.${state.phase}`;

      this.handA = state.cards.filter(c => c.location === this.game.yourHand()).sort((a, b) => a.order > b.order ? 1 : -1);
      this.handB = state.cards.filter(c => c.location === this.game.otherHand()).sort((a, b) => a.order > b.order ? 1 : -1);

      this.tableA = state.cards.filter(c => c.location === this.game.yourTable()).sort((a, b) => a.order > b.order ? 1 : -1).map(c => this.extendTableCard(c));
      this.tableB = state.cards.filter(c => c.location === this.game.otherTable()).sort((a, b) => a.order > b.order ? 1 : -1).map(c => this.extendTableCard(c));

      this.deckACount = state.cards.filter(c => c.location === this.game.yourDeck()).length;
      this.deckBCount = state.cards.filter(c => c.location === this.game.otherDeck()).length;
    }));
  }

  ngOnDestroy() {
    this.subs.forEach(sub => sub.unsubscribe());
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



  hoverHandCard(card: TGameCard) {
    this.fullCardImg = card.image;
    if (card.selectableAction) { this.info = card.selectableAction.text; }
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
    } else {
      this.tableB = this.tableB.map(card => ({ ...card, ...this.defaultCardPos(card) }));
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

  // -------------------------- Actions --------------------------

  skipPhase() {
    this.game.action('skip-phase');
  }

  drawCard() {
    if (this.canIDraw) { this.game.action('draw'); }
  }

  selectCardFromYourHand(card: TGameCard) {
    if (card.selectableAction) {
      this.game.action(card.selectableAction.action, { gId: card.gId });
    }
  }

}
