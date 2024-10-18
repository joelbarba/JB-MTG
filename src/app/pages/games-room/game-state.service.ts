import { Injectable } from '@angular/core';
import { Subject, map } from 'rxjs';
import { AuthService } from '../../core/common/auth.service';
import { ShellService } from '../../shell/shell.service';
import { DocumentReference, Firestore, QuerySnapshot, collection, doc, getDoc, getDocs, onSnapshot, query, setDoc, DocumentData } from '@angular/fire/firestore';
import { EPhase, TAction, TCard, TCardLocation, TGameState, TGameCard, TGameCards, TGameOption, TPlayer } from '../../core/types';




@Injectable({ providedIn: 'root' })
export class GameStateService {
  library: Array<TCard> = [];
  initPromise!: Promise<void>;

  gameDocRef: any;
  gameDocSub: any;

  state$ = new Subject<TGameState>();
  state!: TGameState;

  currentGameId = '';
  playerANum: '1' | '2' = '1'; // You are always playerA, but can be 1 or 2
  playerBNum: '1' | '2' = '2'; // Your opponent2

  yourDeck  = () => 'deck' + this.playerANum as TCardLocation;  // deck1 | deck2
  yourHand  = () => 'hand' + this.playerANum as TCardLocation;  // hand1 | hand2
  yourTable = () => 'tble' + this.playerANum as TCardLocation;  // tble1 | tble2
  yourGrav  = () => 'grav' + this.playerANum as TCardLocation;  // grav1 | grav2

  otherDeck  = () => 'deck' + this.playerBNum as TCardLocation;  // deck1 | deck2
  otherHand  = () => 'hand' + this.playerBNum as TCardLocation;  // hand1 | hand2
  otherTable = () => 'tble' + this.playerBNum as TCardLocation;  // tble1 | tble2
  otherGrav  = () => 'grav' + this.playerBNum as TCardLocation;  // grav1 | grav2

  constructor(
    public auth: AuthService,
    public shell: ShellService,
    public firestore: Firestore,
  ) {
    this.state$.subscribe(state => this.state = state);
    this.loadLibrary();
  }

  loadLibrary() { // Load card library
    this.initPromise = new Promise(resolve => {
      getDocs(collection(this.firestore, 'cards')).then((ref: QuerySnapshot<DocumentData>) => {
        this.library = [];
        ref.forEach(doc => {
          const card = doc.data() as TCard;
          this.library.push({
            id    : doc.id,
            cast  : card.cast,
            color : card.color,
            name  : card.name,
            image : card.image,
            text  : card.text,
            type  : card.type,
          });
        });
        console.log(this.library);
        resolve();
      });
    });   
  }


  async activateGame(gameId: string) {
    await this.auth.profilePromise;
    await this.initPromise; // wait to have all the cards loaded

    this.currentGameId = gameId;
    this.gameDocRef = doc(this.firestore, 'games', gameId);

    if (this.gameDocSub) { this.gameDocSub(); } // unsubscribe if previous detected

    // Changes on the game document from Firebase
    this.gameDocSub = onSnapshot(this.gameDocRef, (docQuery: any) => {
      const source = docQuery.metadata.hasPendingWrites ? 'local' : 'server';
      const nextState = docQuery.data();
      console.log('DB onSnapshot() from -->', source, nextState);

      if (!this.state) { this.initState(nextState); } // First load of the game
      if (source === 'server') { this.state$.next(nextState); } // Propagate changes from DB
    });
  }

  private initState(nextState: TGameState) { // Initialize internal vars for the first time
    if (this.auth.profileUserId === nextState.player1.userId) {
      this.playerANum = '1';
      this.playerBNum = '2';
    } else if (this.auth.profileUserId === nextState.player2.userId) {
      this.playerANum = '2';
      this.playerBNum = '1';
    } else {
      nextState.status = 'error';
    }
  }



  // ------------------------------------------------------------------------ //
  // -- Every state change goes through an action that calls this function -- //
  // ------------------------------------------------------------------------ //
  action(action: TAction, options: { gId?: string, targets?: Array<string> } = {}) {
    const nextState = { ...this.state };

    switch (action) {
      case 'start-game':          this.startGame(nextState); break;
      case 'skip-phase':          this.skipPhase(nextState); break;
      case 'draw':                this.draw(nextState);  break;
      case 'summon-land':         this.summonLand(nextState, options.gId || ''); break;
    }

    // Update the state
    this.state$.next(nextState); // Local update of the state (before it's saved to DB)
    setDoc(this.gameDocRef, nextState).then(_ => {});
  }
  
  // --------------------------- ACTIONS ----------------------------------
  private startGame(nextState: TGameState) {
    nextState.status = 'playing';
    this.setNextOptions(nextState);
  }

  private skipPhase(nextState: TGameState) {
    this.jumpToNextPhase(nextState);
  }

  private draw(nextState: TGameState) {
    const deck = nextState.cards.filter(c => c.location === this.yourDeck()).sort((a, b) => a.order > b.order ? 1 : -1);
    const card = deck.at(-1);
    if (card) {
      card.location = this.yourHand();
      this.currentPlayerObj(nextState).drawnCards += 1;
      this.setNextOptions(nextState);

    } else { // no more cards to draw (you (A) lose, player B wins)
      if (nextState.currentPlayerNum === this.playerANum) { nextState.status = 'player2win'; }
      if (nextState.currentPlayerNum === this.playerBNum) { nextState.status = 'player1win'; }
    }
  }

  private summonLand(nextState: TGameState, gId: string) {
    const cardsTable = nextState.cards.filter(c => c.location === this.yourTable()).sort((a, b) => a.order > b.order ? 1 : -1);

    const card = nextState.cards.find(c => c.gId === gId);
    if (card && card.type === 'land') {
      if (card.location === this.yourHand()) {
        card.location = this.yourTable();
        this.currentPlayerObj(nextState).summonedLands += 1;
        const lastCard = cardsTable.at(-1);
        if (!lastCard) {
          card.order = 0;
        } else {
          card.order = lastCard.order + 1;
        }
      }
    }

    this.setNextOptions(nextState);
  }


  // --------------------------- NEXT OPTIONS ----------------------------------
  
  private setNextOptions(nextState: TGameState) {    
    nextState.cards.forEach(c => c.selectableAction = null);
    nextState.options = [];
    let canSkipPhase = true;

    const player = this.currentPlayerObj(nextState);

    if (nextState.phase === EPhase.draw && player.drawnCards < 1) {
      nextState.options.push({ player: this.playerANum, action: 'draw' });
      canSkipPhase = false; // Player must draw
    }

    if (nextState.phase === EPhase.pre || nextState.phase === EPhase.post) {

      // You can summon lands
      if (nextState.player1.summonedLands === 0) {
        nextState.cards.filter(c => c.location === this.yourHand() && c.type === 'land').forEach(card => {
          card.selectableAction = { text: `Summon ${card.name}`, action: 'summon-land' };
          nextState.options.push({ player: this.playerANum, action: 'summon-land', gId: card.gId });
        });
      }
    }

    if (canSkipPhase) {
      nextState.options.push({ player: nextState.currentPlayerNum, action: 'skip-phase' });
    }
  }

  private jumpToNextPhase(nextState: TGameState) {
    switch (nextState.phase) {
      case EPhase.untap:        nextState.phase = EPhase.maintenance; break;
      case EPhase.maintenance:  nextState.phase = EPhase.draw; break;
      case EPhase.draw:         nextState.phase = EPhase.pre; break;
      case EPhase.pre:          nextState.phase = EPhase.combat; break;
      case EPhase.combat:       nextState.phase = EPhase.post; break;
      case EPhase.post:         nextState.phase = EPhase.discard; break;
      case EPhase.discard:      nextState.phase = EPhase.end; break;
      case EPhase.end:          this.endTurn(nextState); break;
    }
    this.setNextOptions(nextState);
  }

  private endTurn(nextState: TGameState) {
    const player = this.currentPlayerObj(nextState);
    player.drawnCards = 0;
    player.summonedLands = 0;
    nextState.currentPlayerNum = nextState.currentPlayerNum === '1' ? '2' : '1';  // change current player
    nextState.phase = EPhase.untap;
  }


  // --------------------------- INTERNALS ----------------------------------
  private currentPlayerObj(state: TGameState): TPlayer {
    if (state.currentPlayerNum === '1') { return state.player1; }
    return state.player2;
  }

}