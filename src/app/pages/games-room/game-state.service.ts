import { Injectable } from '@angular/core';
import { Subject, map } from 'rxjs';
import { AuthService } from '../../core/common/auth.service';
import { ShellService } from '../../shell/shell.service';
import { DocumentReference, Firestore, QuerySnapshot, collection, doc, getDoc, getDocs, onSnapshot, query, setDoc, DocumentData } from '@angular/fire/firestore';
import { EPhase, TAction, TCard, TCardLocation, TGameState, TGameCard, TGameCards, TActionParams, TPlayer, TCardType, TCardSemiLocation, TCardAnyLocation, TCast, TGameOption } from '../../core/types';




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
  doYouHaveControl(): boolean { return this.state.control === this.playerANum; }

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
      case 'start-game':              nextState.status = 'playing'; break;
      case 'skip-phase':              this.endPhase(nextState); break;
      case 'draw':                    this.draw(nextState);  break;
      case 'tap-land':                this.tapLand(nextState, gId); break;
      case 'untap-card':              this.untapCard(nextState, gId); break;
      case 'untap-all':               this.untapAll(nextState); break;
      case 'select-card-to-discard':  this.discardCard(nextState, gId); break;
      case 'burn-mana':               this.burnMana(nextState); break;
      case 'summon-land':             this.summonLand(nextState, gId); break;
      case 'summon-creature':         this.summonCreature(nextState, gId, manaForUncolor); break;
      case 'summon-instant-spell':    this.summonInstantSpell(nextState, params); break;
      case 'cancel-summon':           this.cancelSummonOperations(nextState); break;
      case 'end-interrupting':        this.endInterrupting(nextState); break;

// select-target-creature
// select-target-player
// cancel-target-selection
// complete-target-selection
// select-attacking-creature
// unselect-attacking-creature
// submit-attack
// select-defending-creature
// submit-defense
    }

    this.setNextOptions(nextState);

    // Update the state
    this.state$.next(nextState); // Local update of the state (before it's saved to DB)
    setDoc(this.gameDocRef, nextState).then(_ => {});
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
    nextState.control = this.playerANum; // Switch back control
  }


  // Check the amount of damage for every creature, and destroys them if needed
  private checkCreatureDamage(nextState: TGameState) {
    const table = nextState.cards.filter(c => c.type === 'creature' && c.location.slice(0, 4) === 'tble');
    table.forEach(card => {
      if ((card.defense || 0) <= (card.damage || 0)) {
        this.moveCard(nextState, card.gId, 'grav');
      }
    });
  }










  // --------------------------- NEXT OPTIONS CALCULATIONS ----------------------------------
  
  // Calculates the next possible options given the current changed state
  private setNextOptions(nextState: TGameState) {
    if (nextState.status !== 'playing') { return; } // in case someone's won
    const { playerA, playerB, turnPlayer } = this.getPlayers(nextState);

    // Remove all actions (from prev state)
    nextState.cards.forEach(card => { card.selectableAction = null; card.selectableTarget = null });
    nextState.options = [];
    playerA.help = '';
    playerB.help = '';

    // Shortcut to check if the current phase is any of the given
    const isPhase = (...phases: string[]) => phases.indexOf(nextState.phase) >= 0


    // If you lost control during your turn (opponent playing interruptions), let him play
    // Or you have control during your opponent's turn (he gave you control to play interruptions)
    if ((nextState.turn === this.playerANum && nextState.control !== this.playerANum)
       ||
        (nextState.turn !== this.playerANum && nextState.control === this.playerANum)) {
      const { table } = this.getCards(nextState, 'playerB');
      
      // Other turn's player may tap lands to produce mana
      table.filter(c => c.type === 'land' && !c.isTapped).forEach(card => {
        const option: TGameOption = { action: 'tap-land', params: { gId: card.gId }, text: `Tap ${card.name}` };
        nextState.options.push(option);
        card.selectableAction = option;
      });
      
      nextState.options.push({ action: 'end-interrupting', params: {}, text: `Skip` });

      return; // You can't do ordinary actions during the other's turn
    }



    // --- Generic options for whoever is the turn's player ---
    const { hand, table } = this.getCards(nextState, 'turn');
    let canSkipPhase = true;
    let spellsAvailable = hand.filter(c => c.type === 'instant').length > 0;
    const summonCard = hand.find(c => c.status?.slice(0, 7) === 'summon:');


    // If turn's player has a summoning operation, let it cancel
    if (summonCard) {
      nextState.options.push({ action: 'cancel-summon', params: {}, text: 'Cancel ' + summonCard.name });
    }


    // Selecting target
    const playingCard = nextState.cards.find(c => c.status === 'summon:selectingTargets');
    if (playingCard?.id === 'c000032') { // Lightning Bolt
      nextState.options.push({ action: 'summon-instant-spell', params: { gId: playingCard.gId, targets: ['player1'] }});
      nextState.options.push({ action: 'summon-instant-spell', params: { gId: playingCard.gId, targets: ['player2'] }});
      nextState.cards.filter(c => c.location.slice(0,4) === 'tble' && c.type === 'creature').forEach(card => {
        card.selectableTarget = { text: `Select target ${card.name}`, value: card.gId };
        nextState.options.push({ action: 'summon-instant-spell', params: { gId: playingCard.gId, targets: [card.gId] } });
      });
      return; // <---- Avoid any other action when selecting a target
    }


    // Casting / Summoning:

    // Turn's player may summon lands on hand
    if (isPhase('pre', 'post') && playerA.summonedLands === 0) {
      hand.filter(c => c.type === 'land').forEach(card => {
        const option: TGameOption = { action: 'summon-land', params: { gId: card.gId }, text: `Summon ${card.name}` };
        nextState.options.push(option);
        card.selectableAction = option;
      });
    }

    // Turn's player may summon creatures
    if (isPhase('pre', 'post')) {
      hand.filter(c => c.type === 'creature').forEach(card => {
        const option: TGameOption = { action: 'summon-creature', params: { gId: card.gId }, text: `Summon ${card.name}` };
        nextState.options.push(option);
        if (!card.status) { card.selectableAction = option; }
      });
    }

    // Turn's player may cast a spell
    if (isPhase('maintenance', 'draw', 'pre', 'combat', 'post')) {
      hand.filter(c => c.type === 'instant').forEach(card => {
        const option: TGameOption = { action: 'summon-instant-spell', params: { gId: card.gId }, text: `Cast ${card.name}` };
        nextState.options.push(option);
        if (!card.status) { card.selectableAction = option; }
      });
    }

    

    // Tapping habilities:

    // Turn's player may tap lands to produce mana
    if (isPhase('pre', 'post') || spellsAvailable) {
      table.filter(c => c.type === 'land' && !c.isTapped).forEach(card => {
        const option: TGameOption = { action: 'tap-land', params: { gId: card.gId }, text: `Tap ${card.name}` };
        nextState.options.push(option);
        card.selectableAction = option;
      });
    }

    // Common turn actions:
    
    // Turn's player may untap cards
    if (isPhase('untap')) {
      nextState.options.push({ action: 'untap-all', params: {}, text: `Untap all your cards` });
      table.filter(c => c.isTapped).forEach(card => {
        const option: TGameOption = { action: 'untap-card', params: { gId: card.gId }, text: `Untap ${card.name}` };
        nextState.options.push(option);
        card.selectableAction = option;
      });    
    }

    // Turn's player may draw a card
    if (isPhase('draw') && playerA.drawnCards < 1) {
      nextState.options.push({ action: 'draw', params: {}, text: `Draw a card from your library` });
      // canSkipPhase = false; // Player must draw   TODO: UNCOMMENT !!!!!!!!!!!!!!!!!!!!!!!!!!!
    }

    // Turn's player may discard a card
    if (isPhase('discard') && hand.length > 7) {
      canSkipPhase = false; // Player must discard if more than 7 cards on the hand
      playerA.help = `You cannot have more than 7 cards on your hand. Please discard`;
      playerB.help = `Waiting for the opponent to discard`;
      hand.forEach(card => {
        const option: TGameOption = { action: 'select-card-to-discard', params: { gId: card.gId }, text: `Discard ${card.name}` };
        nextState.options.push(option);
        card.selectableAction = option;
      });
    }

    // Turn's player may burn unspent mana
    if (isPhase('end') && playerA.manaPool.some(m => m > 0)) {
      canSkipPhase = false;  // Player must burn unspent mana
      playerA.help = `You have to burn unspent mana`;
      nextState.options.push({ action: 'burn-mana', params: {} });
    }

    // Turn's player may do nothing (skip phase)
    if (canSkipPhase) {
      nextState.options.push({ action: 'skip-phase', params: {} });
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
    nextState.control = nextState.turn; // give control to the other player
    nextState.phase = EPhase.untap;
    table.filter(c => c.status === 'sickness').forEach(c => c.status = null); // Summon sickness ends

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



}