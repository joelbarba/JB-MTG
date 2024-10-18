import { Injectable } from '@angular/core';
import { Subject, map } from 'rxjs';
import { AuthService } from '../../core/common/auth.service';
import { ShellService } from '../../shell/shell.service';
import { DocumentReference, Firestore, QuerySnapshot, collection, doc, getDoc, getDocs, onSnapshot, query, setDoc, DocumentData } from '@angular/fire/firestore';
import { EPhase, TAction, TCard, TCardLocation, TGameState, TGameCard, TGameCards, TGameOption, TPlayer, TCardType, TCardSemiLocation, TCardAnyLocation, TCast } from '../../core/types';




@Injectable({ providedIn: 'root' })
export class GameStateService {
  library: Array<TCard> = [];
  initPromise!: Promise<void>;

  gameDocRef: any;
  gameDocSub: any;

  state$ = new Subject<TGameState>();
  state!: TGameState;

  prevState!: TGameState; // Snapshot of the previous state

  currentGameId = '';
  playerANum: '1' | '2' = '1'; // You are always playerA, but can be 1 or 2
  playerBNum: '1' | '2' = '2'; // Your opponent2

  playerA = () => this.playerANum === '1' ? this.state.player1 : this.state.player2;
  playerB = () => this.playerBNum === '1' ? this.state.player1 : this.state.player2;

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
          const filteredCard = card.keyFilter('cast, color, name, image, text, type, attack, defense');
          this.library.push({ id: doc.id, ...filteredCard } as TCard);
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
      // console.log('DB onSnapshot() from -->', source, nextState);

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

  // Purely debuggin option
  rollbackState() {
    const nextState = JSON.parse(JSON.stringify(this.prevState)) as TGameState;
    this.setNextOptions(nextState);
    this.state$.next(nextState);
    setDoc(this.gameDocRef, nextState).then(_ => {});
  }






  // --------------------------------- Helper functions ---------------------------------

  getTurnPlayerLetter(): 'A' | 'B' { return this.state.turn === this.playerANum ? 'A' : 'B'; }
  isYourTurn(): boolean { return this.getTurnPlayerLetter() === 'A'; }

  // Shortcut for state objects (relative players)
  getPlayers(state: TGameState) {
    const player1    = state.player1;
    const player2    = state.player2;
    const playerA    = this.playerANum === '1' ? state.player1 : state.player2;
    const playerB    = this.playerBNum === '1' ? state.player1 : state.player2;
    const turnPlayer = state.turn      === '1' ? state.player1 : state.player2;
    return { player1, player2, playerA, playerB, turnPlayer };
  }

  // Shortcut for state objects (cards split on locations)
  getCards(state: TGameState, playerCode: 'player1' | 'player2' | 'playerA' | 'playerB' | 'turn') {
    let pNum = '';
    if (playerCode === 'player1') { pNum = '1'; }
    if (playerCode === 'player2') { pNum = '2'; }
    if (playerCode === 'playerA') { pNum = this.playerANum; }
    if (playerCode === 'playerB') { pNum = this.playerBNum; }
    if (playerCode === 'turn')    { pNum = state.turn; }
    const deck      = state.cards.filter(c => c.location === 'deck' + pNum).sort((a, b) => a.order > b.order ? 1 : -1);
    const hand      = state.cards.filter(c => c.location === 'hand' + pNum).sort((a, b) => a.order > b.order ? 1 : -1);
    const table     = state.cards.filter(c => c.location === 'tble' + pNum).sort((a, b) => a.order > b.order ? 1 : -1);
    const graveyard = state.cards.filter(c => c.location === 'grav' + pNum).sort((a, b) => a.order > b.order ? 1 : -1);
    return { deck, hand, table, graveyard };
  }












  // ------------------------------------------------------------------------ //
  // -- Every state change goes through an action that calls this function -- //
  // ------------------------------------------------------------------------ //
  action(action: TAction, options: { gId?: string, manaForUncolor?: TCast, targets?: Array<string> } = {}) {
    if (!this.verifyAction(action, options)) { console.error('Wrong action', action); return; }
    this.prevState  = JSON.parse(JSON.stringify(this.state)) as TGameState;
    const nextState = JSON.parse(JSON.stringify(this.state)) as TGameState;

    // Actions should be always triggered by you (this.playerANum)

    const gId = options?.gId || '';
    const manaForUncolor = options.manaForUncolor || [0,0,0,0,0,0];
    switch (action) {
      case 'start-game':              nextState.status = 'playing'; break;
      case 'skip-phase':              this.endPhase(nextState); break;
      case 'draw':                    this.draw(nextState);  break;
      case 'summon-land':             this.summonLand(nextState, gId); break;
      case 'summon-creature':         this.summonCreature(nextState, gId, manaForUncolor); break;
      case 'cancel-summon-creature':  this.cancelSummonOperations(nextState); break;
      case 'cast-spell':              this.castSpell(nextState, gId, manaForUncolor, options.targets); break;
      case 'tap-land':                this.tapLand(nextState, gId); break;
      case 'untap-card':              this.untapCard(nextState, gId); break;
      case 'select-card-to-discard':  this.discardCard(nextState, gId); break;
      case 'burn-mana':               this.burnMana(nextState); break;
    }

    this.setNextOptions(nextState);

    // Update the state
    this.state$.next(nextState); // Local update of the state (before it's saved to DB)
    setDoc(this.gameDocRef, nextState).then(_ => {});
  }

  // Verifies that the given action is possible, being into the options[] array
  private verifyAction(action: TAction, options: { gId?: string, targets?: Array<string> } = {}): boolean {
    const ops = this.state.options.filter(o => o.action === action && o.player === this.playerANum);
    if (!ops.length) { return false; }
    const checkGId = () => !!ops.find(o => o.gId === options.gId);
    if (action === 'summon-land') { return checkGId(); }
    return true;
  }
  
  // --------------------------- ACTIONS ----------------------------------

  private untapCard(nextState: TGameState, gId: string) {
    const card = this.checkCard(nextState, gId, { location: 'tble' });
    if (card) { card.isTapped = false; }
  }

  private draw(nextState: TGameState) {
    const card = this.getCards(nextState, 'playerA').deck.at(-1);
    if (card) {
      card.location = this.yourHand();
      this.getPlayers(nextState).playerA.drawnCards += 1;

    } else { this.endGame(nextState, 'B'); } // if no more cards to draw, you lose
  }

  private summonLand(nextState: TGameState, gId: string) {
    if (this.checkCard(nextState, gId, { type: 'land', location: 'hand' })) {
      this.moveCard(nextState, gId, 'tble');
      this.getPlayers(nextState).playerA.summonedLands += 1;
    }
  }

  private tapLand(nextState: TGameState, gId: string) {
    const card = this.checkCard(nextState, gId, { type: 'land', location: 'tble' });
    if (card) {
      const { playerA } = this.getPlayers(nextState);
      if (card.id === 'c000001') { playerA.manaPool[1] += 2; } // Island   = Blue mana
      if (card.id === 'c000002') { playerA.manaPool[2] += 1; } // Plains   = White mana
      if (card.id === 'c000003') { playerA.manaPool[3] += 3; } // Swamp    = Black mana
      if (card.id === 'c000004') { playerA.manaPool[4] += 1; } // Mountain = Red mana
      if (card.id === 'c000005') { playerA.manaPool[5] += 4; } // Forest   = Green mana
      card.isTapped = true;
    }
  }

  private discardCard(nextState: TGameState, gId: string) {
    if (this.checkCard(nextState, gId, { location: 'hand' })) {
      this.moveCard(nextState, gId, 'grav');
    }
  }

  private burnMana(nextState: TGameState) {
    const { playerA } = this.getPlayers(nextState);
    for (let t = 0; t < playerA.manaPool.length; t++) {
      playerA.life -= playerA.manaPool[t];
      playerA.manaPool[t] = 0;
    }
  }

  private summonCreature(nextState: TGameState, gId: string, manaForUncolor: TCast) {
    const { playerA } = this.getPlayers(nextState);

    const card = this.checkCard(nextState, gId, { location: 'hand' });
    if (card) {
      this.cancelSummonOperations(nextState);

      if (!card.summonStatus || card.summonStatus === 'waitingMana' || card.summonStatus === 'selectingMana') {

        let rightMana = false; // Whether you have the right mana in your mana pool
        const manaStatus = this.checkMana(card.cast, playerA.manaPool);
        if (manaStatus === 'not enough') {
          card.summonStatus = 'waitingMana';
          
        } else if (manaStatus === 'manual') {
          rightMana = card.cast[0] <= manaForUncolor.reduce((v,a) => v + a, 0);
          if (!rightMana) { card.summonStatus = 'selectingMana'; } // If there is not enough uncolor selected

        } else if (manaStatus === 'exact' || manaStatus === 'auto') {
          manaForUncolor = this.calcManaForUncolored(card.cast, playerA.manaPool);
          rightMana = true;
        }

        if (rightMana) {
          this.spendMana(card.cast, playerA.manaPool, manaForUncolor);          
          card.summonStatus = 'summoning';
          card.summonTime = (new Date()).getTime();
        }

      } else if (card.summonStatus === 'summoning') {
        this.moveCard(nextState, gId, 'tble');
        card.summonStatus = 'sickness';
      }

    }
  }

  // Cancel any other ongoing summonining operation for your
  private cancelSummonOperations(nextState: TGameState) {
    const { hand } = this.getCards(nextState, 'playerA');
    hand.filter(c => c.summonStatus === 'waitingMana' || c.summonStatus === 'selectingMana').forEach(c => c.summonStatus = null);
  }

  // Validates the mana in the mana pool to cast a card
  // - 'not enough' = There not enough mana
  // - 'exact' --> There is the exact mana
  // - If there is more mana:
  //    - 'auto' -> If all uncolored can be taken from the same source
  //    - 'manual' -> If there are different colors to be used as uncolored (cherry picking)
  checkMana(cast: TCast, playerManaPool: TCast): 'not enough' | 'exact' | 'auto' | 'manual' {
    const manaPool = [...playerManaPool] as TCast;
    for (let t = 1; t <= 5; t++) { manaPool[t] -= cast[t]; } // Subtract colored mana
    if (manaPool.some(m => m < 0)) { return 'not enough'; }  // Not enought colored mana
    if (cast[0] === 0) { return 'exact'; }                   // Enough colored mana (and 0 colorless)

    const sameColor = manaPool.filter(v => v).length === 1;
    const colorlessInPool = manaPool.reduce((v,a) => v + a, 0);
    if (colorlessInPool < cast[0]) { return 'not enough'; } // Not enough colorless mana
    if (colorlessInPool === cast[0]) { return 'exact'; }    // Exact colored and colorless mana
    if (sameColor) { return 'auto'; } // More mana, but of the same color
    return 'manual'; // More mana of different color
  }

  // When the mana is exact or auto, you can calculate the right manaForUncolor[]
  private calcManaForUncolored(cast: TCast, playerManaPool: TCast) {
    const manaForUncolor = [0, 0, 0, 0, 0, 0] as TCast;
    const manaPool = [...playerManaPool] as TCast;
    for (let t = 1; t <= 5; t++) { manaPool[t] -= cast[t]; } // Subtract colored mana
    let uncoloredNeeded = cast[0];
    for (let t = 0; t <= 5; t++) {
      const manaToTake = Math.min(manaPool[t], uncoloredNeeded);
      manaForUncolor[t] += manaToTake;
      uncoloredNeeded -= manaToTake;
    }
    return manaForUncolor;
  }

  // Decreases the manaPool[] as much as the cast needs with manaUsed
  private spendMana(cast: TCast, manaPool: TCast, manaForUncolor: TCast) {
    for (let t = 1; t <= 5; t++) { manaPool[t] -= cast[t]; }            // Subtract colored mana
    for (let t = 0; t <= 5; t++) { manaPool[t] -= manaForUncolor[t]; }  // Subtract uncolored mana
  }

  
  
  
  
  
  
  private castSpell(nextState: TGameState, gId: string, mana?: TCast, target?: string[]) {
  }


  // --------------------------- NEXT OPTIONS CALCULATIONS ----------------------------------
  
  // Calculates the next possible options given the current changed state
  private setNextOptions(nextState: TGameState) {
    if (nextState.status !== 'playing') { return; } // in case someone's won
    const { playerA, playerB, turnPlayer } = this.getPlayers(nextState);

    // Remove all actions (from prev state)
    nextState.cards.forEach(c => c.selectableAction = null);
    nextState.options = [];
    playerA.help = '';
    playerB.help = '';

    // Shortcut to check if the current phase is any of the given
    const isPhase = (...phases: string[]) => phases.indexOf(nextState.phase) >= 0

    if (nextState.turn === this.playerANum) { // If your turn
      // const player = this.playerANum; // Options for yourself

    } else { // If your opponent's turn

    }


    // --- Generic options for whoever is the turn's player ---
    const { hand, table } = this.getCards(nextState, 'turn');
    let canSkipPhase = true;
    let spellsAvailable = hand.filter(c => c.type === 'instant').length > 0;

    // Turn's player may cast a spell
    if (isPhase('maintenance', 'draw', 'pre', 'combat', 'post')) {
      hand.filter(c => c.type === 'instant').filter(c => this.checkMana(c.cast, turnPlayer.manaPool) === 'auto').forEach(card => {
        card.selectableAction = { text: `Cast ${card.name}`, action: 'cast-spell' };
        nextState.options.push({ player: nextState.turn, action: 'cast-spell', gId: card.gId });
      });
    }    

    // Turn's player may tap lands to produce mana
    if (isPhase('pre', 'post') || spellsAvailable) {
      table.filter(c => c.type === 'land' && !c.isTapped).forEach(card => {
        card.selectableAction = { text: `Tap ${card.name}`, action: 'tap-land' };
        nextState.options.push({ player: nextState.turn, action: 'tap-land', gId: card.gId });
      });
    }



    // Turn's player may untap cards
    if (isPhase('untap')) {
      table.filter(c => c.isTapped).forEach(card => {
        card.selectableAction = { text: `Untap ${card.name}`, action: 'untap-card' };
        nextState.options.push({ player: nextState.turn, action: 'untap-card', gId: card.gId });
      });    
    }

    // Turn's player may draw a card
    if (isPhase('draw') && playerA.drawnCards < 1) {
      nextState.options.push({ player: nextState.turn, action: 'draw' });
      canSkipPhase = false; // Player must draw
    }

    // Turn's player may summon lands on hand
    if (isPhase('pre', 'post') && playerA.summonedLands === 0) {
      hand.filter(c => c.type === 'land').forEach(card => {
        card.selectableAction = { text: `Summon ${card.name}`, action: 'summon-land' };
        nextState.options.push({ player: nextState.turn, action: 'summon-land', gId: card.gId });
      });
    }

    // Turn's player may summon creatures
    if (isPhase('pre', 'post')) {
      hand.filter(c => c.type === 'creature').forEach(card => {
        nextState.options.push({ player: nextState.turn, action: 'summon-creature', gId: card.gId });
        if (!card.summonStatus) {
          card.selectableAction = { text: `Summon ${card.name}`, action: 'summon-creature' };
        }
        if (card.summonStatus === 'waitingMana' || card.summonStatus === 'selectingMana') { // Cancel the operation
          nextState.options.push({ player: nextState.turn, action: 'cancel-summon-creature', gId: card.gId });          
        }
      });
    }

    // Turn's player may discard a card
    if (isPhase('discard') && hand.length > 7) {
      canSkipPhase = false; // Player must discard if more than 7 cards on the hand
      playerA.help = `You cannot have more than 7 cards on your hand. Please discard`;
      playerB.help = `Waiting for the opponent to discard`;
      hand.forEach(card => {
        card.selectableAction = { text: `Discard ${card.name}`, action: 'select-card-to-discard' };
        nextState.options.push({ player: nextState.turn, action: 'select-card-to-discard', gId: card.gId });
      });
    }

    // Turn's player may burn unspent mana
    if (isPhase('end') && playerA.manaPool.some(m => m > 0)) {
      canSkipPhase = false;  // Player must burn unspent mana
      playerA.help = `You have to burn unspent mana`;
      nextState.options.push({ player: nextState.turn, action: 'burn-mana' });
    }

    // Turn's player may do nothing (skip phase)
    if (canSkipPhase) {
      nextState.options.push({ player: nextState.turn, action: 'skip-phase' });
    }
  }


  // ----------------------------------------------------------------------------------

  // Advances the phase for the given state, or ends the turn
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
  }

  // End the phase
  private endPhase(nextState: TGameState) {
    this.cancelSummonOperations(nextState);
    this.jumpToNextPhase(nextState);
  }

  // End the turn and reset all turn counters and values
  private endTurn(nextState: TGameState) {
    const { turnPlayer } = this.getPlayers(nextState);
    const { table } = this.getCards(nextState, 'turn');
    turnPlayer.drawnCards = 0;
    turnPlayer.summonedLands = 0;
    nextState.turn = nextState.turn === '1' ? '2' : '1';  // change current player
    nextState.phase = EPhase.untap;
    table.filter(c => c.summonStatus === 'sickness').forEach(c => c.summonStatus = null); // Summon sickness ends

    // if (nextState.turn)
    if (turnPlayer.life <= 0) { this.endGame(nextState, nextState.turn); return; }

    const newTurnPlayer = this.getPlayers(nextState).turnPlayer;
  }

  // Ends the game and sets the winner (player1win / player2win)
  private endGame(nextState: TGameState, winner: 'A' | 'B' | '1' | '2') {
    if (winner === 'A') { winner = this.playerANum; }
    if (winner === 'B') { winner = this.playerBNum; }
    nextState.status = `player${winner}win`;
  }


  // --------------------------- INTERNALS ----------------------------------

  // Validates if a given card exists (gId) and has the "options"
  private checkCard(state: TGameState, gId: string, options: { type?: TCardType, location?: TCardAnyLocation }): false | TGameCard {
    const { type, location } = options;
    const card = state.cards.find(c => c.gId === gId);
    if (!card) { return false; }
    if (type && type !== card.type) { return false; } // Should match the type
    if (location && card.location.indexOf(location) < 0) { return false; } // Should match the location
    return card;
  }


  // Moves a card from its current location to another.
  // toLocation must be 'hand', 'tble', 'grav' (will add the player number from the current location)
  private moveCard(state: TGameState, gId: string, toLocation: string) {
    const card = state.cards.find(c => c.gId === gId);
    if (card) {
      toLocation += card.location.at(-1);
      const lastCard = state.cards.filter(c => c.location === toLocation).sort((a,b) => a.order > b.order ? 1 : -1).at(-1);
      if (lastCard) { card.order = lastCard.order + 1; } else { card.order = 0; }
      card.location = toLocation as TCardLocation;
    }
  }



}