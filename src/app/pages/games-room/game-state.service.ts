import { Injectable } from '@angular/core';
import { Subject, Subscription, map } from 'rxjs';
import { AuthService } from '../../core/common/auth.service';
import { ShellService } from '../../shell/shell.service';
import { DocumentReference, Firestore, QuerySnapshot, collection, doc, getDoc, getDocs, onSnapshot, query, setDoc, DocumentData, Unsubscribe } from '@angular/fire/firestore';
import { EPhase, TAction, TCard, TCardLocation, TGameState, TGameDBState, TGameCard, TGameCards, TActionParams, TPlayer, TCardType, TCardSemiLocation, TCardAnyLocation, TCast, TGameOption, ESubPhase } from '../../core/types';
import { GameOptionsService } from './game/game.options.service';




@Injectable({ providedIn: 'root' })
export class GameStateService {
  library: Array<TCard> = [];
  initPromise!: Promise<void>;

  gameId!: string;
  gameDocSub!: Unsubscribe;
  gameStateSub!: Subscription;
  gameHistoryRef: any;

  dbState$ = new Subject<TGameDBState>();
  state$ = new Subject<TGameState>();
  state!: TGameState;

  prevState!: TGameState; // Snapshot of the previous state
  dbFutureStates: Array<TGameState> = []; // Queue for future state updates that come disordered (before the right ones)

  playerANum: '1' | '2' = '1'; // You are always playerA, but can be 1 or 2
  playerBNum: '1' | '2' = '2'; // Your opponent2

  debugMode = false;

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
    private options: GameOptionsService,
  ) {
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
        // console.log(this.library);
        resolve();
      });
    });   
  }


  async activateGame(gameId: string) {
    await this.auth.profilePromise;
    await this.initPromise; // wait to have all the cards loaded

    this.gameId = gameId;

    if (this.gameDocSub) { this.gameDocSub(); } // unsubscribe if previous detected

    // Changes on the game document from Firebase
    this.gameDocSub = onSnapshot(doc(this.firestore, 'games', gameId), (docQuery: any) => {
      const source = docQuery.metadata.hasPendingWrites ? 'local' : 'server';
      const dbState = docQuery.data();
      // console.log('DB onSnapshot() from -->', source, nextState);
      
      if (!this.state) { this.initState(dbState); } // First load of the game
      
      // Propagate changes from DB
      if (source === 'server') {
        console.log('DB onSnapshot(): New State from -->', source);
        
        if (!this.state || this.state.id === dbState.id - 1) {
          // console.log('DB onSnapshot() --> New state from remote ACTION: ', dbState.lastAction);
          this.dbState$.next(dbState);

          // Find if there are future updates that came before this one
          let nextId = dbState.id + 1;
          for (let t = 0; t < this.dbFutureStates.length; t++) {
            const futureState = this.dbFutureStates[t];
            if (futureState.id === nextId) {
              console.warn('DB onSnapshot() --> New state from (stacked) ACTION: ', dbState.lastAction);
              this.dbState$.next(futureState); nextId++;
              delete this.dbFutureStates[t];
            }            
          }
          this.dbFutureStates = this.dbFutureStates.filter(v => !!v);
        }
        else if (this.state.id < dbState.id - 1) { // If there's more than 1 new state / action
          this.dbFutureStates.push(dbState); // This is a future update, we are missing previous updates (stack it and wait)
          this.dbFutureStates.sort((a, b) => a.id < b.id ? 1: -1);
          console.warn('DB onSnapshot() --> Disordered (not executed, stacked) ACTION:: ', dbState.lastAction);

        } else {
          console.error('THAT SHOULD NOT HAPPEN. state.id=', this.state.id, 'dbState.id=', dbState.id);
        }
      }
    });

    // Extend the raw DB state:  dbState$ ---> state$
    if (this.gameStateSub) { this.gameStateSub.unsubscribe(); }
    this.gameStateSub = this.dbState$.subscribe((dbState: TGameDBState) => {
      console.log('New State. Last action =', `${dbState.lastAction?.action}`, 'STATE:', this.state);
      this.state = this.options.calculate(dbState, this.playerANum);
      this.state$.next(this.state);
      // console.log('New State - Options =', state.options.map(o => `${o.action}:${o.params?.gId}`), state);
    });
  }


  private initState(state: TGameState) { // Initialize internal vars for the first time
    if (this.auth.profileUserId === state.player1.userId) {
      this.playerANum = '1';
      this.playerBNum = '2';
    } else if (this.auth.profileUserId === state.player2.userId) {
      this.playerANum = '2';
      this.playerBNum = '1';
    } else {
      state.status = 'error';
    }
  }


  // DEBUGGING part to temporarily save the state to a different doc
  async saveStateDebug() {
    const dbState = this.state.keyFilter((v,k) => k !== 'options') as TGameDBState;
    dbState.cards = dbState.cards.map(card => card.keyFilter((v,k) => k !== 'selectableAction' && k !== 'selectableTarget')) as Array<TGameCard>;
    await setDoc(doc(this.firestore, 'games', 'tmpGameState'), dbState);
  }
  async loadStateDebug() {
    const docSnap = await getDoc(doc(this.firestore, 'games', 'tmpGameState'));
    await setDoc(doc(this.firestore, 'games', this.gameId), docSnap.data()).then(_ => {});
    console.log('State rolled back to saved. YOU MUST REFRESH THE BROWSER');
    location.reload(); // Reload the browser
  }




  // --------------------------------- Helper functions ---------------------------------

  getTurnPlayerLetter(): 'A' | 'B' { return this.state.turn === this.playerANum ? 'A' : 'B'; }
  isYourTurn(): boolean { return this.getTurnPlayerLetter() === 'A'; }
  doYouHaveControl(): boolean { return this.state.control === this.playerANum; }

  getTime() {
    const time = new Date();
    let timeStr = (time.getFullYear() + '').padStart(4, '0') + '-';
    timeStr += ((time.getMonth() + 1) + '').padStart(2, '0') + '-';
    timeStr += (time.getDay() + '').padStart(2, '0') + ' ';
    timeStr += (time.getHours() + '').padStart(2, '0') + ':';
    timeStr += (time.getMinutes() + '').padStart(2, '0') + ':';
    timeStr += (time.getSeconds() + '').padStart(2, '0') + '.';
    timeStr += (time.getMilliseconds() + '').padStart(3, '0');
    return timeStr
  }

  // Shortcut for state objects (relative players)
  getPlayers(state: TGameState = this.state) {
    const player1    = state.player1;
    const player2    = state.player2;
    const playerA    = this.playerANum === '1' ? state.player1 : state.player2;
    const playerB    = this.playerBNum === '1' ? state.player1 : state.player2;
    const turnPlayer       = state.turn    === '1' ? state.player1 : state.player2;
    const controlPlayer    = state.control === '1' ? state.player1 : state.player2;
    const attackingPlayer  = state.turn    === '1' ? state.player1 : state.player2;
    const defendingPlayer  = state.turn    === '1' ? state.player2 : state.player1;
    return { player1, player2, playerA, playerB, turnPlayer, controlPlayer, attackingPlayer, defendingPlayer };
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

  // Shortcut for state objects (cards split on locations)
  getGroups(state: TGameState) {
    const deck        = state.cards.filter(c => c.location.slice(0,4) === 'deck').sort((a, b) => a.order > b.order ? 1 : -1);
    const hand        = state.cards.filter(c => c.location.slice(0,4) === 'hand').sort((a, b) => a.order > b.order ? 1 : -1);
    const table       = state.cards.filter(c => c.location.slice(0,4) === 'tble').sort((a, b) => a.order > b.order ? 1 : -1);
    const play        = state.cards.filter(c => c.location.slice(0,4) === 'play').sort((a, b) => a.order > b.order ? 1 : -1);
    const graveyard   = state.cards.filter(c => c.location.slice(0,4) === 'grav').sort((a, b) => a.order > b.order ? 1 : -1);
    const deckA       = state.cards.filter(c => c.location === 'deck' + this.playerANum).sort((a, b) => a.order > b.order ? 1 : -1);
    const deckB       = state.cards.filter(c => c.location === 'deck' + this.playerBNum).sort((a, b) => a.order > b.order ? 1 : -1);
    const handA       = state.cards.filter(c => c.location === 'hand' + this.playerANum).sort((a, b) => a.order > b.order ? 1 : -1);
    const handB       = state.cards.filter(c => c.location === 'hand' + this.playerBNum).sort((a, b) => a.order > b.order ? 1 : -1);
    const tableA      = state.cards.filter(c => c.location === 'tble' + this.playerANum).sort((a, b) => a.order > b.order ? 1 : -1);
    const tableB      = state.cards.filter(c => c.location === 'tble' + this.playerBNum).sort((a, b) => a.order > b.order ? 1 : -1);
    const playA       = state.cards.filter(c => c.location === 'play' + this.playerANum).sort((a, b) => a.order > b.order ? 1 : -1);
    const playB       = state.cards.filter(c => c.location === 'play' + this.playerBNum).sort((a, b) => a.order > b.order ? 1 : -1);
    const graveyardA  = state.cards.filter(c => c.location === 'grav' + this.playerANum).sort((a, b) => a.order > b.order ? 1 : -1);
    const graveyardB  = state.cards.filter(c => c.location === 'grav' + this.playerBNum).sort((a, b) => a.order > b.order ? 1 : -1);
    return { deck,  hand,  table,  play,  graveyard,
             deckA, handA, tableA, playA, graveyardA, 
             deckB, handB, tableB, playB, graveyardB };
  }












  // ------------------------------------------------------------------------ //
  // -- Every state change goes through an action that calls this function -- //
  // ------------------------------------------------------------------------ //
  action(action: TAction, params: TActionParams = {}) {
    if (action !== 'refresh' && !this.verifyAction(action, params)) { console.error('Wrong action', action); return; }
    this.prevState  = JSON.parse(JSON.stringify(this.state)) as TGameState;
    const nextState = JSON.parse(JSON.stringify(this.state)) as TGameState;

    console.log('ACTION: ', action, params);

    // Actions should be always triggered by you (this.playerANum)

    const gId = params?.gId || '';
    const manaForUncolor = params.manaForUncolor || [0,0,0,0,0,0];
    switch (action) {
      case 'start-game':                nextState.status = 'playing'; break;
      case 'skip-phase':                this.endPhase(nextState); break;
      case 'draw':                      this.draw(nextState);  break;
      case 'tap-land':                  this.tapLand(nextState, gId); break;
      case 'untap-card':                this.untapCard(nextState, gId); break;
      case 'untap-all':                 this.untapAll(nextState); break;
      case 'select-attacking-creature': this.selectAttackingCreature(nextState, gId); break;
      case 'cancel-attack':             this.cancelAttack(nextState); break;
      case 'submit-attack':             this.submitAttack(nextState); break;
      case 'select-defending-creature': this.selectDefendingCreature(nextState, params); break;
      case 'cancel-defense':            this.cancelDefense(nextState); break;
      case 'submit-defense':            this.submitDefense(nextState); break;
      case 'select-card-to-discard':    this.discardCard(nextState, gId); break;
      case 'burn-mana':                 this.burnMana(nextState); break;
      case 'summon-land':               this.summonLand(nextState, gId); break;
      case 'summon-creature':           this.summonCreature(nextState, gId, manaForUncolor); break;
      case 'summon-spell':              this.summonSpell(nextState, params); break;
      case 'cancel-summon':             this.cancelSummonOperations(nextState); break;
      case 'release-stack':             this.releaseStack(nextState); break;
      // case 'end-interrupting':          this.endInterrupting(nextState); break;

    }

    nextState.id += 1;
    nextState.lastAction = { action, params, player: this.playerANum, time: this.getTime() };

    // Update the state
    this.dbState$.next(nextState); // Local update of the state (before it's saved to DB)

    // Stripe out properties that do not need to be on DB
    const dbState = nextState.keyFilter((v,k) => k !== 'options') as TGameDBState;
    dbState.cards = dbState.cards.map(card => card.keyFilter((v,k) => k !== 'selectableAction' && k !== 'selectableTarget')) as Array<TGameCard>;
    setDoc(doc(this.firestore, 'games', this.gameId), dbState).then(_ => {});

    // Save history
    const hActionId = 'action-' + (nextState.id + '').padStart(4, '0');
    setDoc(doc(this.firestore, 'gamesHistory', this.gameId, 'history', hActionId), nextState.lastAction).then(_ => {});
  }

  // Verifies that the given action is possible, being into the options[] array
  private verifyAction(action: TAction, params: TActionParams = {}): boolean {
    const ops = this.state.options.filter(o => o.action === action);
    if (!ops.length) { return false; }
    const checkGId = () => !!ops.find(o => o.params?.gId === params.gId);
    if (action === 'summon-land') { return checkGId(); }
    return true;
  }
  
  // --------------------------- ACTIONS ----------------------------------

  private untapCard(nextState: TGameState, gId: string) {
    const card = this.checkCard(nextState, gId, { location: 'tble' });
    if (card) { card.isTapped = false; }
  }

  private untapAll(nextState: TGameState) {
    const { table } = this.getCards(nextState, 'playerA');
    table.filter(card => card.isTapped).forEach(card => card.isTapped = false);
  }

  private draw(nextState: TGameState) {
    const card = this.getCards(nextState, 'playerA').deck[0];
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
      if (card.id === 'c000003') { playerA.manaPool[3] += 1; } // Swamp    = Black mana
      if (card.id === 'c000004') { playerA.manaPool[4] += 1; } // Mountain = Red mana
      if (card.id === 'c000005') { playerA.manaPool[5] += 1; } // Forest   = Green mana
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
    const { playerA, playerB } = this.getPlayers(nextState);

    const card = this.checkCard(nextState, gId, { location: 'hand', type: 'creature' });
    if (card) {
      this.cancelSummonOperations(nextState, card.gId); // Cancel other possible castings operations

      if (!card.status || card.status === 'summon:waitingMana' || card.status === 'summon:selectingMana') {

        let rightMana = false; // Whether you have the right mana in your mana pool
        const manaStatus = this.checkMana(card.cast, playerA.manaPool);
        if (manaStatus === 'not enough') {
          card.status = 'summon:waitingMana';
          
        } else if (manaStatus === 'exact' || manaStatus === 'auto') {
          manaForUncolor = this.calcManaForUncolored(card.cast, playerA.manaPool);
          rightMana = true;
          
        } else if (manaStatus === 'manual') {
          rightMana = card.cast[0] <= manaForUncolor.reduce((v,a) => v + a, 0);
          if (!rightMana) { card.status = 'summon:selectingMana'; } // If there is not enough uncolor selected
        }

        if (rightMana) {
          this.spendMana(card.cast, playerA.manaPool, manaForUncolor);          
          card.status = 'summoning';
          this.addToSpellStack(nextState, card);
        }
      }
    }
  }

  private summonSpell(nextState: TGameState, params: TActionParams) {
    const { playerA, playerB } = this.getPlayers(nextState);

    const gId = params?.gId || '';
    let manaForUncolor = params.manaForUncolor || [0,0,0,0,0,0];


    const card = this.checkCard(nextState, gId, { location: 'hand' });
    if (card) {      
      this.cancelSummonOperations(nextState, card.gId); // Cancel other possible castings operations

      if (!card.status || card.status?.slice(0, 7) === 'summon:') { // summon:waitingMana, summon:selectingMana, summon:selectingTargets

        let rightMana = false; // Whether you have the right mana in your mana pool
        const manaStatus = this.checkMana(card.cast, playerA.manaPool);
        if (manaStatus === 'not enough') {
          card.status = 'summon:waitingMana';
          
        } else if (manaStatus === 'exact' || manaStatus === 'auto') {
          manaForUncolor = this.calcManaForUncolored(card.cast, playerA.manaPool);
          rightMana = true;

        } else if (manaStatus === 'manual') {
          rightMana = card.cast[0] === manaForUncolor.reduce((v,a) => v + a, 0);
          if (!rightMana) { card.status = 'summon:selectingMana'; } // If there is not enough uncolor selected
        }

        if (rightMana) {
          let neededTargets = 0;
          if (card.id === 'c000032') { neededTargets = 1; }; // Lightling bolt  // TODO: Add neededTargets field on cards[]
          if (card.id === 'c000043') { neededTargets = 1; }; // Giant Growth    // TODO: Add neededTargets field on cards[]
          if (card.id === 'c000038') { neededTargets = 1; }; // Counter Spell   // TODO: Add neededTargets field on cards[]

          if (neededTargets !== (params.targets?.length || 0)) { card.status = 'summon:selectingTargets'; }
          else {
            console.log(`SUMMONING ${card.name} (${params.gId}), manaForUncolor=${params.manaForUncolor}, targets=${params.targets}`);
            this.spendMana(card.cast, playerA.manaPool, manaForUncolor);
            card.status = 'summoning';
            card.targets = params.targets;
            this.addToSpellStack(nextState, card);
          }
        }

      }
    }
  }


  private addToSpellStack(nextState: TGameState, card: TGameCard) {
    const { playerA, playerB } = this.getPlayers(nextState);
    this.moveCard(nextState, card.gId, 'stack'); // Move playing card to the stack
    playerB.stackCall = true; // Activate opponent's stack call, so he gets control later to add more spells to the stack
    if (!playerA.stackCall) { this.switchPlayerControl(nextState); }  // stack initiator (you are just playing a spell)
  }


  private releaseStack(nextState: TGameState) {
    const { playerA, playerB } = this.getPlayers(nextState);
    playerA.stackCall = false;

    if (playerB.stackCall) { // If you added spells, opponent may add more spells too. Llet him do it
      this.switchPlayerControl(nextState);

    } else { // If both stackCall are false (you didn't add any new spell), run the spell stack
      console.log('You are both done, RUN THE STACK of SPELLS');
      this.runSpellStack(nextState);
      if (nextState.phase === 'combat') { this.continueCombat(nextState); }      
    }    
  }


  private runSpellStack(nextState: TGameState) {
    const stack = nextState.cards.filter(c => c.location === 'stack').sort((a,b) => a.order > b.order ? -1 : 1); // inverse order ([max,...,min])
    stack.forEach(card => card.location === 'stack' && this.runSummonEvent(nextState, card));
    this.killDamagedCreatures(nextState);
    nextState.control = nextState.turn; // Return control to the turn player
  }



  runSummonEvent(nextState: TGameState, card: TGameCard) {
    console.log(`EXECUTING ${card.name} (${card.gId}), targets=${card.targets}`);
    const target = (card.targets || [])[0]; // code of the first target (playerX, gId, ...)

    // Summoning creature
    if (card.type === 'creature' && card.status === 'summoning') {
      this.moveCard(nextState, card.gId, 'tble');
      card.status = 'sickness';
    }

    // Summoning instant spell
    if (card.type === 'instant' && card.status === 'summoning') {
      this.moveCard(nextState, card.gId, 'grav'); // Move instant to graveyard
      card.status = null;
    }

    // Summoning interruption
    if (card.type === 'interruption' && card.status === 'summoning') {
      this.moveCard(nextState, card.gId, 'grav'); // Move instant to graveyard
      card.status = null;
    }


    if (card.id === 'c000032') { // Lightling bolt
      if      (target === 'player1') { nextState.player1.life -= 3; } // Deals 3 points of damage to player1
      else if (target === 'player2') { nextState.player2.life -= 3; } // Deals 3 points of damage to player2
      else { // Target creature
        const targetCard = nextState.cards.find(c => c.gId === target);
        if (targetCard && (targetCard.location === 'stack' || targetCard.location.slice(0,4) === 'tble')) { 
          targetCard.damage = (targetCard.damage || 0) + 3;   // Deals 3 points of damage to target creature
        }
        
      }
    }

    if (card.id === 'c000043') { // Gian Growth
      const targetCard = nextState.cards.find(c => c.gId === target); // target must be a creature
      if (targetCard && (targetCard.location === 'stack' || targetCard.location.slice(0,4) === 'tble')) { 
        targetCard.attack += 3; 
        targetCard.defense += 3; // TODO: Change this to tunrEffect
      }
    }

    if (card.id === 'c000038') { // Counter Spell      
      const targetCard = nextState.cards.find(c => c.gId === target && c.location === 'stack');
      if (targetCard) { // Remove the target from the stack (won't be executed)
        this.moveCard(nextState, targetCard.gId, 'grav'); 
        card.status = null;
      }
    }

  }



  // Cancel any other ongoing summon:XXX operation for your
  private cancelSummonOperations(nextState: TGameState, exceptgId?: string) {
    const { hand } = this.getCards(nextState, 'playerA');
    hand.filter(c => c.gId !== exceptgId && c.status?.slice(0, 7) === 'summon:').forEach(c => c.status = null);
  }





  private selectAttackingCreature(nextState: TGameState, gId: string) {
    const { table } = this.getCards(nextState, 'playerA');
    const creature = table.find(c => c.gId === gId);
    if (creature) { creature.status = 'combat:attacking'; creature.isTapped = true; }
  }

  private cancelAttack(nextState: TGameState) {
    const attackingCreatures = nextState.cards.filter(c => c.status === 'combat:attacking');
    attackingCreatures.forEach(card => {
      card.status = null;
      card.isTapped = false;
    });
  }

  private submitAttack(nextState: TGameState) {
    const { playerA, playerB, attackingPlayer, defendingPlayer } = this.getPlayers(nextState);
    nextState.subPhase = ESubPhase.attacking;
    defendingPlayer.stackCall = true; // Activate opponent's stack call, so he gets control to cast spells
    // attackingPlayer.stackCall = true; // You may also play spells
    this.switchPlayerControl(nextState, defendingPlayer);
  }

  // Advance combat subphases after the spell stack is released:
  // selectAttack --> attacking (spell stack) --> selectDefense
  // selectDefense --> defending (spell stack) --> afterCombat
  // afterCombat (spell stack) --> end
  private continueCombat(nextState: TGameState) {
    const { playerA, playerB, attackingPlayer, defendingPlayer } = this.getPlayers(nextState);

    // If for whatever reason, the attacking creatures were killed by spells, end the combat
    const attackingCreatures = nextState.cards.filter(c => c.status === 'combat:attacking');
    if (!attackingCreatures.length) { this.endCombat(nextState); }

    if (nextState.subPhase === 'attacking') {
      nextState.subPhase = ESubPhase.selectDefense;
      this.switchPlayerControl(nextState, defendingPlayer);

    } else if (nextState.subPhase === 'defending') {
      this.runCombat(nextState);
      this.switchPlayerControl(nextState, attackingPlayer);

    } else if (nextState.subPhase === 'afterCombat') {
      this.endCombat(nextState);      
    }
  }

  private selectDefendingCreature(nextState: TGameState, params: TActionParams) {
    const { table } = this.getCards(nextState, 'playerA');
    const gId = params.gId || '';
    const creature = table.find(c => c.gId === gId);
    if (creature) {
      if (params.targets && params.targets.length) {
        creature.status = 'combat:defending';
        creature.targets = params.targets;
      } else {
        nextState.cards.filter(c => c.status === 'combat:selectingTarget').forEach(c => c.status = null); // unselect previous (if any)
        creature.status = 'combat:selectingTarget';
      }
    }
  }

  private cancelDefense(nextState: TGameState) {
    const defendingCreatures = nextState.cards.filter(c => c.status === 'combat:defending' || c.status === 'combat:selectingTarget');
    defendingCreatures.forEach(card => card.status = null);
  }

  private submitDefense(nextState: TGameState) {
    const { playerA, playerB, attackingPlayer, defendingPlayer } = this.getPlayers(nextState);
    nextState.subPhase = ESubPhase.defending;
    attackingPlayer.stackCall = true; // Activate opponent's stack call, so he gets control to cast spells
    // defendingPlayer.stackCall = true; // You may also play spells
    this.switchPlayerControl(nextState, attackingPlayer);
  }

  private runCombat(nextState: TGameState) {
    const { playerA, playerB, attackingPlayer, defendingPlayer } = this.getPlayers(nextState);
    const attackingCreatures = nextState.cards.filter(c => c.status === 'combat:attacking');
    const defendingCreatures = nextState.cards.filter(c => c.status === 'combat:defending');

    let totalDamage = 0;
    attackingCreatures.forEach(attackingCard => {
      const defendingCard = defendingCreatures.find(c => c.targets?.includes(attackingCard.gId));
      const attackerTxt = `Attacking ${attackingCard.gId} (${attackingCard.attack}/${attackingCard.defense})`;

      if (defendingCard) { // Creatre blocked by another
        defendingCard.damage = attackingCard.attack;
        attackingCard.damage = defendingCard.attack;
        
        const defenserTxt = `Defending ${defendingCard.gId} (${attackingCard.attack}/${attackingCard.defense})`;
        console.log(`${attackerTxt} -----> deals ${attackingCard.attack} points of damage to ${defenserTxt}`);
        console.log(`${defenserTxt} -----> deals ${defendingCard.attack} points of damage to ${attackerTxt}`);
        
      } else { // If the creature is not blocked
        console.log(`${attackerTxt} -----> deals ${attackingCard.attack} points of damage to player${this.playerANum}`); // You are the defender
        totalDamage += attackingCard.attack; 
      }
    });

    defendingPlayer.life -= totalDamage; // None blocked creatures damage defending player

    nextState.subPhase = ESubPhase.afterCombat;
    attackingPlayer.stackCall = true;
    defendingPlayer.stackCall = true;
  }

  private endCombat(nextState: TGameState) {
    const { playerA, playerB, attackingPlayer, defendingPlayer } = this.getPlayers(nextState);
    this.killDamagedCreatures(nextState);  // Check those creatures that received more damage than defense, and kill them    
    nextState.cards.filter(c => c.status?.slice(0,6) === 'combat').forEach(card => {
      card.status = null;
      card.targets = [];
    });
    this.switchPlayerControl(nextState, attackingPlayer);
    this.endPhase(nextState);
  }




  // ----------------------------------------------------------------------------------

  // Advances the phase for the given state, or ends the turn
  private endPhase(nextState: TGameState) {
    this.cancelSummonOperations(nextState);
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

    // If starting combat phase, init sub-phase
    nextState.subPhase = null;
    if (nextState.phase === EPhase.combat) { nextState.subPhase = ESubPhase.selectAttack; }
  }

  // End the turn and reset all turn counters and values
  private endTurn(nextState: TGameState) {
    const { turnPlayer } = this.getPlayers(nextState);
    const { table, tableA } = this.getGroups(nextState);
    turnPlayer.drawnCards = 0;
    turnPlayer.summonedLands = 0;
    nextState.turn = nextState.turn === '1' ? '2' : '1';  // change current player
    nextState.control = nextState.turn; // give control to the other player
    nextState.phase = EPhase.untap;
    tableA.filter(c => c.status === 'sickness').forEach(c => c.status = null); // Summon sickness ends
    table.filter(c => c.type === 'creature').forEach(c => c.damage = 0); // Damage on creatures is reset

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

  private switchPlayerControl(nextState: TGameState, player = this.playerB()) {
    nextState.control = player.num;
    player.controlTime = (new Date()).getTime();
    console.log('SERVICE - Switching CONTROL to opponent => control = ', nextState.control);
  }

  // Validates if a given card exists (gId) and has the "options"
  private checkCard(state: TGameState, gId: string, options: { type?: TCardType, location?: TCardAnyLocation }): false | TGameCard {
    const { type, location } = options;
    const card = state.cards.find(c => c.gId === gId);
    if (!card) { return false; }
    if (type && type !== card.type) { return false; } // Should match the type
    if (location && card.location.indexOf(location) < 0) { return false; } // Should match the location
    return card;
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


  // Moves a card from its current location to another.
  // If toLocation is deck, hand, tble or grav, the player number is added from the current location
  private moveCard(state: TGameState, gId: string, toLocation: string) {
    const card = state.cards.find(c => c.gId === gId);
    if (card) {
      const fromLocation = card.location;
      let playerNum = fromLocation.at(-1);
      if (playerNum !== '1' && playerNum !== '2') { playerNum = card.controller; }
      if (['deck', 'hand', 'tble', 'grav'].includes(toLocation)) { toLocation += playerNum; }

      // Move the card to the last position in the destination
      const lastCard = state.cards.filter(c => c.location === toLocation).sort((a,b) => a.order > b.order ? 1 : -1).at(-1);
      if (lastCard) { card.order = lastCard.order + 1; } else { card.order = 0; }

      card.location = toLocation as TCardLocation;

      // Recalculate orders to make them sequential
      state.cards.filter(c => c.location === fromLocation).sort((a,b) => a.order > b.order ? 1 : -1).forEach((card, ind) => card.order = ind);
      state.cards.filter(c => c.location === toLocation).sort((a,b) => a.order > b.order ? 1 : -1).forEach((card, ind) => card.order = ind);
    }
  }

  // Check the amount of damage for every creature, and destroys them if needed
  private killDamagedCreatures(nextState: TGameState) {
    const table = nextState.cards.filter(c => c.type === 'creature' && c.location.slice(0, 4) === 'tble');
    table.forEach(card => {
      if ((card.defense || 0) <= (card.damage || 0)) {
        console.log(`Creature ${card.gId} ${card.name} (${card.attack}/${card.defense}) has received "${card.damage}" points of damage ---> IT DIES (go to graveyard)`);
        this.moveCard(nextState, card.gId, 'grav');
        card.status = null;
        card.targets = [];
      }
    });
  }

}