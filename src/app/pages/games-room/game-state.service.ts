import { Injectable } from '@angular/core';
import { Subject, map } from 'rxjs';
import { AuthService } from '../../core/common/auth.service';
import { ShellService } from '../../shell/shell.service';
import { DocumentReference, Firestore, QuerySnapshot, collection, doc, getDoc, getDocs, onSnapshot, query, setDoc, DocumentData } from '@angular/fire/firestore';
import { EPhase, TAction, TCard, TCardLocation, TGameState, TGameDBState, TGameCard, TGameCards, TActionParams, TPlayer, TCardType, TCardSemiLocation, TCardAnyLocation, TCast, TGameOption, ESubPhase } from '../../core/types';




@Injectable({ providedIn: 'root' })
export class GameStateService {
  library: Array<TCard> = [];
  initPromise!: Promise<void>;

  gameDocRef: any;
  gameDocSub: any;
  gameHistoryRef: any;

  state$ = new Subject<TGameDBState>();
  stateExt$ = this.state$.pipe(map(state => this.extendState(state)));
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
      const dbState = docQuery.data();
      // console.log('DB onSnapshot() from -->', source, nextState);
      
      if (!this.state) { this.initState(dbState); } // First load of the game
      
      // Propagate changes from DB
      if (source === 'server') { 
        console.log('DB onSnapshot() from -->', source);
        
        if (!this.state || this.state.id === dbState.id - 1) {
          console.log('DB onSnapshot() --> New state from remote ACTION: ', dbState.lastAction);
          this.state$.next(dbState);

          // Find if there are future updates that came before this one
          let nextId = dbState.id + 1;
          for (let t = 0; t < this.dbFutureStates.length; t++) {
            const futureState = this.dbFutureStates[t];
            if (futureState.id === nextId) {
              console.warn('DB onSnapshot() --> New state from (stacked) ACTION: ', dbState.lastAction);
              this.state$.next(futureState); nextId++;
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
  }
  dbFutureStates: Array<TGameState> = [];



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

  private extendState(dbState: TGameDBState): TGameState {
    const state = this.calculateOptions(dbState);
    // console.log('New State - Options =', state.options.map(o => `${o.action}:${o.params?.gId}`), state);
    // history.map(h => `${h.time} - player${h.player}:${h.action}`)
    console.log('New State. Last action =', `${dbState.lastAction?.action}`, state);
    this.state = state;
    return state;
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
    const turnPlayer    = state.turn    === '1' ? state.player1 : state.player2;
    const controlPlayer = state.control === '1' ? state.player1 : state.player2;
    return { player1, player2, playerA, playerB, turnPlayer, controlPlayer };
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
      case 'end-combat':                this.endCombat(nextState); break;
      case 'select-card-to-discard':    this.discardCard(nextState, gId); break;
      case 'burn-mana':                 this.burnMana(nextState); break;
      case 'summon-land':               this.summonLand(nextState, gId); break;
      case 'summon-creature':           this.summonCreature(nextState, gId, manaForUncolor); break;
      case 'summon-instant-spell':      this.summonInstantSpell(nextState, params); break;
      case 'cancel-summon':             this.cancelSummonOperations(nextState); break;
      case 'end-interrupting':          this.endInterrupting(nextState); break;

    }

    // TODO: DELETE THIS
    if (nextState.phase !== 'combat') {
      nextState.cards.filter(c => c.status?.slice(0,6) === 'combat').forEach(c => c.status = null);
    }

    // this.setNextOptions(nextState);
    nextState.id += 1;
    nextState.lastAction = { action, params, player: this.playerANum, time: this.getTime() };

    // Update the state
    this.state$.next(nextState); // Local update of the state (before it's saved to DB)

    // Stripe out properties that do not need to be on DB
    const dbState = nextState.keyFilter((v,k) => k !== 'options') as TGameDBState;
    dbState.cards = dbState.cards.map(card => card.keyFilter((v,k) => k !== 'selectableAction' && k !== 'selectableTarget')) as Array<TGameCard>;
    setDoc(this.gameDocRef, dbState).then(_ => {});

    // Save history
    const hActionId = 'action-' + (nextState.id + '').padStart(4, '0');
    setDoc(doc(this.firestore, 'gamesHistory', this.currentGameId, 'history', hActionId), nextState.lastAction).then(_ => {});
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
          nextState.control = this.playerBNum; // Switch control
          playerB.controlTime = (new Date()).getTime();
          console.log('SERVICE - Summoning creature and setting CONTROL to opponent => control = ', nextState.control);
        }

      } else if (card.status === 'summoning') {
        this.moveCard(nextState, gId, 'tble');
        card.status = 'sickness';
      }

    }
  }


  private summonInstantSpell(nextState: TGameState, params: TActionParams) {
    const { playerA, playerB } = this.getPlayers(nextState);

    const gId = params?.gId || '';
    let manaForUncolor = params.manaForUncolor || [0,0,0,0,0,0];


    const card = this.checkCard(nextState, gId, { location: 'hand', type: 'instant' });
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
          const hasTarget = card.id === 'c000032'; // Lightling bolt

          if (hasTarget && card.status !== 'summon:selectingTargets') { card.status = 'summon:selectingTargets'; }
          else {

            console.log(`SUMMONING - gId=${params.gId}, manaForUncolor=${params.manaForUncolor},  targets=${params.targets}`);

            if (card.status === 'summon:selectingTargets' && params.targets?.length === 1) {
              // card.status = null;
              this.spendMana(card.cast, playerA.manaPool, manaForUncolor);
              card.status = 'summoning';
              card.targets = params.targets;
              nextState.control = this.playerBNum; // Switch control
              playerB.controlTime = (new Date()).getTime();
              console.log('SERVICE - Summoning instant and setting CONTROL to opponent => control = ', nextState.control);
             }
          }
        }        


      } else if (card.status === 'summoning') {

        console.log(`EXECUTING INSTANT - gId=${params.gId}, targets=${params.targets}`);
        card.status = null;
        if (card.id === 'c000032') { // Lightling bolt
          if (card.targets?.length === 1) {
            const target = (params.targets || [])[0];
            if      (target === 'player1') { nextState.player1.life -= 3; }
            else if (target === 'player2') { nextState.player2.life -= 3; }
            else { // Target creature
              const targetCard = nextState.cards.find(c => c.gId === target);
              if (targetCard) { 
                targetCard.damage = (targetCard.damage || 0) + 3; // Deals 3 points of damage
                this.checkCreatureDamage(nextState);
              }
            }
            this.moveCard(nextState, gId, 'grav'); // Move instant to graveyard
          } 
        } 
      }

    }
  }



  // Cancel any other ongoing summon:XXX operation for your
  private cancelSummonOperations(nextState: TGameState, exceptgId?: string) {
    const { hand } = this.getCards(nextState, 'playerA');
    hand.filter(c => c.gId !== exceptgId && c.status?.slice(0, 7) === 'summon:').forEach(c => c.status = null);
  }


  // Mark the end of the interruption break
  private endInterrupting(nextState: TGameState) {
    nextState.control = this.playerBNum; // Switch back control
    console.log('SERVICE - End Interrupting - Switching back control to opponent => control = ', nextState.control);
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
    const { playerA, playerB } = this.getPlayers(nextState);
    // nextState.subPhase = ESubPhase.attacking;
    nextState.subPhase = ESubPhase.selectDefense;
    nextState.control = this.playerBNum; // Switch control
    playerB.controlTime = (new Date()).getTime();
    console.log('SERVICE - Submitting Atack. Switching CONTROL to opponent => control = ', nextState.control);
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
    const { playerA, playerB, turnPlayer } = this.getPlayers(nextState);

    const attackingCreatures = nextState.cards.filter(c => c.status === 'combat:attacking');
    const defendingCreatures = nextState.cards.filter(c => c.status === 'combat:defending');
    nextState.subPhase = ESubPhase.afterCombat;

    let totalDamage = 0;
    attackingCreatures.forEach(attackingCard => {
      const defendingCard = defendingCreatures.find(c => c.targets?.includes(attackingCard.gId));
      const attackerTxt = `Attacking ${attackingCard.gId} (${attackingCard.attack}/${attackingCard.defense})`;

      if (defendingCard) { // Blocking
        defendingCard.damage = attackingCard.attack;
        attackingCard.damage = defendingCard.attack;
        
        const defenserTxt = `Defending ${defendingCard.gId} (${attackingCard.attack}/${attackingCard.defense})`;

        console.log(`${attackerTxt} -----> deals ${attackingCard.attack} points of damage to ${defenserTxt}`);
        console.log(`${defenserTxt} -----> deals ${defendingCard.attack} points of damage to ${attackerTxt}`);

        // Wait for instants before this.....
        if ((attackingCard.defense || 0) <= (attackingCard.damage || 0)) { console.log('attacking', attackingCard.gId, 'dies'); }
        if ((defendingCard.defense || 0) <= (attackingCard.damage || 0)) { console.log('defending', defendingCard.gId, 'dies'); }
        
      } else {
        console.log(`${attackerTxt} -----> deals ${attackingCard.attack} points of damage to player${this.playerANum}`); // You are the defender
        totalDamage += attackingCard.attack; 
      } // No block
    });

    playerA.life -= totalDamage; // None blocked creatures damage defending player
  }

  private endCombat(nextState: TGameState) {
    this.checkCreatureDamage(nextState);  // Check those creatures that received more damage than defense, and kill them    
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
      const fromLocation = card.location;
      toLocation += fromLocation.at(-1);
      const lastCard = state.cards.filter(c => c.location === toLocation).sort((a,b) => a.order > b.order ? 1 : -1).at(-1);
      if (lastCard) { card.order = lastCard.order + 1; } else { card.order = 0; }
      card.location = toLocation as TCardLocation;

      // Recalculate orders to make them sequential
      state.cards.filter(c => c.location === fromLocation).sort((a,b) => a.order > b.order ? 1 : -1).forEach((card, ind) => card.order = ind);
      state.cards.filter(c => c.location === toLocation).sort((a,b) => a.order > b.order ? 1 : -1).forEach((card, ind) => card.order = ind);
    }
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

  // Check the amount of damage for every creature, and destroys them if needed
  private checkCreatureDamage(nextState: TGameState) {
    const table = nextState.cards.filter(c => c.type === 'creature' && c.location.slice(0, 4) === 'tble');
    table.forEach(card => {
      if ((card.defense || 0) <= (card.damage || 0)) {
        console.log(`Creature ${card.gId} ${card.name} (${card.attack}/${card.defense}) has received "${card.damage}" points of damage ---> IT DIES (go to graveyard)`);
        this.moveCard(nextState, card.gId, 'grav');
      }
    });
  }










  // --------------------------- NEXT OPTIONS CALCULATIONS ----------------------------------

  // Calculates your possible options for a current state
  // It modifies/extends:
  //  - state.options[]
  //  - state.cards[].selectableAction    - state.player1/2.help
  //  - state.cards[].selectableTarget
  private calculateOptions(dbState: TGameDBState): TGameState {
    const state: TGameState = { ...dbState, options: [] };
    state.cards.forEach(card => { card.selectableAction = null; card.selectableTarget = null });  // Remove all actions (from prev state)

    const { playerA, playerB, turnPlayer } = this.getPlayers(state);
    const { hand, table } = this.getCards(state, 'playerA'); // Your cards

    // Shortcut to check if the current phase is any of the given
    const isPhase = (...phases: string[]) => phases.includes(state.phase);    

    let canSkipPhase = true;
    playerA.help = '';

    if (state.control !== this.playerANum) { return state; } // If you don't have control, you have no options

    // If the game is not running
    if (state.status === 'created') { state.options.push({ action: 'start-game', params: {} }); return state; }
    if (state.status !== 'playing') { return state; } // in case someone's won



    // If it's not your turn, yet you have control (casting interruptions, defend from atack, ...)
    if (state.turn !== this.playerANum) {
      const tableA = state.cards.filter(c => c.location === 'tble' + this.playerANum).sort((a, b) => a.order > b.order ? 1 : -1);
      const tableB = state.cards.filter(c => c.location === 'tble' + this.playerBNum).sort((a, b) => a.order > b.order ? 1 : -1);

      // Combat - Defending from an atack
      if (isPhase('combat')) {
        if (state.subPhase === 'selectDefense') {
          state.options.push({ action: 'cancel-defense', params: {}, text: 'Reset you defending selection' });
          state.options.push({ action: 'submit-defense', params: {}, text: 'Defend with selected creatures' });
  
          // You may select a creature to defend your opponents attack
          tableA.filter(c => c.type === 'creature' && !c.isTapped && c.status !== 'combat:defending').forEach(card => {
            const option: TGameOption = { action: 'select-defending-creature', params: { gId: card.gId }, text: `Defend with ${card.name}` };
            state.options.push(option);
            card.selectableAction = option;
          });
  
          // You may select the opponent's attacking creature as a target of your defending creature
          const defenderToAssign = state.cards.find(c => c.status === 'combat:selectingTarget');
          if (defenderToAssign) {
            tableB.filter(c => c.status === 'combat:attacking').forEach(card => {
              const params = { gId: defenderToAssign.gId, targets: [card.gId] };
              const option: TGameOption = { action: 'select-defending-creature', params, text: `Defend ${card.name} with ${defenderToAssign.name}` };
              state.options.push(option);
              card.selectableAction = option;
            });
          }
        } else if (state.subPhase === 'afterCombat') {
          state.options.push({ action: 'end-interrupting', params: {}, text: `Skip` });
        }

      } else { // Opponent is not on the combat phase
        state.options.push({ action: 'end-interrupting', params: {}, text: `Skip` });

        // You may tap lands to produce mana
        tableA.filter(c => c.type === 'land' && !c.isTapped).forEach(card => {
          const option: TGameOption = { action: 'tap-land', params: { gId: card.gId }, text: `Tap ${card.name}` };
          state.options.push(option);
          card.selectableAction = option;
        });
      }

      return state; // <---- Skip generic options (it's not your turn)
    }



    
    // If you have a summoning operation, let it cancel
    const summonCard = hand.find(c => c.status?.slice(0, 7) === 'summon:');
    if (summonCard) { state.options.push({ action: 'cancel-summon', params: {}, text: 'Cancel ' + summonCard.name }); }


    // Selecting target
    const playingCard = state.cards.find(c => c.status === 'summon:selectingTargets');
    if (playingCard?.id === 'c000032') { // Lightning Bolt
      state.options.push({ action: 'summon-instant-spell', params: { gId: playingCard.gId, targets: ['player1'] }});
      state.options.push({ action: 'summon-instant-spell', params: { gId: playingCard.gId, targets: ['player2'] }});
      state.cards.filter(c => c.location.slice(0,4) === 'tble' && c.type === 'creature').forEach(card => {
        card.selectableTarget = { text: `Select target ${card.name}`, value: card.gId };
        state.options.push({ action: 'summon-instant-spell', params: { gId: playingCard.gId, targets: [card.gId] } });
      });
      return state; // <---- Avoid any other action when selecting a target
    }






    // Casting / Summoning:

    // You may summon lands on hand
    if (isPhase('pre', 'post') && playerA.summonedLands === 0) {
      hand.filter(c => c.type === 'land').forEach(card => {
        const option: TGameOption = { action: 'summon-land', params: { gId: card.gId }, text: `Summon ${card.name}` };
        state.options.push(option);
        card.selectableAction = option;
      });
    }

    // You may summon creatures
    if (isPhase('pre', 'post')) {
      hand.filter(c => c.type === 'creature').forEach(card => {
        const option: TGameOption = { action: 'summon-creature', params: { gId: card.gId }, text: `Summon ${card.name}` };
        state.options.push(option);
        if (!card.status) { card.selectableAction = option; }
      });
    }

    // You may summon/cast an instant spell
    if (isPhase('maintenance', 'draw', 'pre', 'combat', 'post')) {
      hand.filter(c => c.type === 'instant').forEach(card => {
        const option: TGameOption = { action: 'summon-instant-spell', params: { gId: card.gId }, text: `Cast ${card.name}` };
        state.options.push(option);
        if (!card.status) { card.selectableAction = option; }
      });
    }

    

    // Tapping habilities:

    // You may tap lands to produce mana
    const spellsAvailable = hand.filter(c => c.type === 'instant').length > 0;
    if (isPhase('pre', 'post') || spellsAvailable) {
      table.filter(c => c.type === 'land' && !c.isTapped).forEach(card => {
        const option: TGameOption = { action: 'tap-land', params: { gId: card.gId }, text: `Tap ${card.name}` };
        state.options.push(option);
        card.selectableAction = option;
      });
    }


    // Combat
    if (isPhase('combat')) {
      const isAttackOn = !!table.filter(c => c.status === 'combat:attacking').length; // Are you leading an attack?

      if (state.subPhase === 'selectAttack') {
        table.filter(c => c.type === 'creature' && !c.isTapped && c.status !== 'sickness').forEach(card => {
          if (card.status !== 'combat:attacking') {
            const option: TGameOption = { action: 'select-attacking-creature', params: { gId: card.gId }, text: `Attack with ${card.name}` };
            state.options.push(option);
            card.selectableAction = option;
          }
        });

        // If you have selected attacking creatures, you may submit the attack
        if (isAttackOn) { 
          state.options.push({ action: 'cancel-attack', params: {}, text: 'Cancel the current attacking selection' });
          state.options.push({ action: 'submit-attack', params: {}, text: 'Attack with selected creatures' });
        }
      }

      // You may finish the combat and end the spell-stack after the combat
      if (state.subPhase === 'afterCombat') { state.options.push({ action: 'end-combat', params: {}, text: 'Continue with the game' }); }

      // If ongoing combat, you can't skip to the next phase, you need to finish with the combat
      if (isAttackOn) { canSkipPhase = false; }
    }

    // Common turn actions:
    
    // You may untap cards
    if (isPhase('untap')) {
      state.options.push({ action: 'untap-all', params: {}, text: `Untap all your cards` });
      table.filter(c => c.isTapped).forEach(card => {
        const option: TGameOption = { action: 'untap-card', params: { gId: card.gId }, text: `Untap ${card.name}` };
        state.options.push(option);
        card.selectableAction = option;
      });    
    }

    // You may draw a card
    if (isPhase('draw') && playerA.drawnCards < 1) {
      state.options.push({ action: 'draw', params: {}, text: `Draw a card from your library` });
      canSkipPhase = false; // Player must draw
    }

    // You may discard a card
    if (isPhase('discard') && hand.length > 7) {
      canSkipPhase = false; // Player must discard if more than 7 cards on the hand
      playerA.help = `You cannot have more than 7 cards on your hand. Please discard`;
      hand.forEach(card => {
        const option: TGameOption = { action: 'select-card-to-discard', params: { gId: card.gId }, text: `Discard ${card.name}` };
        state.options.push(option);
        card.selectableAction = option;
      });
    }

    // You may burn unspent mana
    if (isPhase('end') && playerA.manaPool.some(m => m > 0)) {
      canSkipPhase = false;  // Player must burn unspent mana
      playerA.help = `You have to burn unspent mana`;
      state.options.push({ action: 'burn-mana', params: {} });
    }

    // You may do nothing (skip phase)
    if (canSkipPhase) {
      state.options.push({ action: 'skip-phase', params: {} });
    }

    return state;
  }


}