import { Injectable } from '@angular/core';
import { Subject, Subscription, map } from 'rxjs';
import { AuthService } from '../../core/common/auth.service';
import { ShellService } from '../../shell/shell.service';
import { DocumentReference, Firestore, QuerySnapshot, collection, doc, getDoc, getDocs, onSnapshot, query, setDoc, DocumentData, Unsubscribe } from '@angular/fire/firestore';
import { EPhase, TAction, TCard, TCardLocation, TGameState, TGameDBState, TGameCard, TGameCards, TActionParams, TPlayer, TCardType, TCardSemiLocation, TCardAnyLocation, TCast, TGameOption, ESubPhase, TEffect } from '../../core/types';
import { runEvent } from './game/gameLogic/game.card-logic';
import { calcManaForUncolored, checkMana, getCards, getPlayers, getTime, killDamagedCreatures, moveCard, moveCardToGraveyard, spendMana } from './game/gameLogic/game.utils';
import { GameOptionsService } from './game/game.options.service';
import { extendCardLogic } from './game/gameLogic/game.card-specifics';




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
      this.options.calculateEffectsFrom(this.state);
      this.options.calculateTargetsFrom(this.state);
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

  // Stripe out extended properties that do not need to be on DB
  private convertToDBState(nextState: TGameState): TGameDBState {
    const dbState = nextState.keyFilter((v,k) => k !== 'options') as TGameDBState;
    const extFields = [
      'selectableAction',
      'selectableTarget',
      'effectsFrom',
      'targetOf',
      'uniqueTargetOf',
      'onSummon',
      'onTap',
      'onDestroy',
      'onDiscard',
      'onEffect',
      'onTargetLookup',
      'canAttack',
      'canDefend',
      'canBlock',
    ]
    dbState.cards = dbState.cards.map(card => card.keyFilter((v,k) => !extFields.includes(k))) as Array<TGameCard>;
    return dbState;
  }


  // DEBUGGING part to temporarily save the state to a different doc
  async saveStateDebug() {
    const dbState = this.convertToDBState(this.state);
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



  getPlayers(state: TGameState = this.state) { return getPlayers(state, this.playerANum); }
  getCards(state: TGameState) { return getCards(state, this.playerANum); }












  // ------------------------------------------------------------------------ //
  // -- Every state change goes through an action that calls this function -- //
  // ------------------------------------------------------------------------ //
  action(action: TAction, params: TActionParams = {}) {
    if (action !== 'refresh' && !this.verifyAction(action, params)) { console.error('Wrong action', action); return; }
    this.prevState  = JSON.parse(JSON.stringify(this.state)) as TGameState;
    const nextState = JSON.parse(JSON.stringify(this.state)) as TGameState;

    console.log('ACTION: ', action, params);

    // Extend specific logic functions on cards
    nextState.cards.forEach(card => extendCardLogic(card));

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
    }

    this.applyEffects(nextState); // Recalculate state based on current effects

    nextState.id += 1;
    nextState.lastAction = { action, params, player: this.playerANum, time: getTime() };

    // Update the state
    this.dbState$.next(nextState); // Local update of the state (before it's saved to DB)

    const dbState = this.convertToDBState(nextState);
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
    const { tableA } = this.getCards(nextState);
    tableA.filter(card => card.isTapped).forEach(card => card.isTapped = false);
  }

  private draw(nextState: TGameState) {
    const card = this.getCards(nextState).deckA[0];
    if (card) {
      card.location = this.yourHand();
      this.getPlayers(nextState).playerA.drawnCards += 1;

    } else { this.endGame(nextState, 'B'); } // if no more cards to draw, you lose
  }

  private summonLand(nextState: TGameState, gId: string) {
    const card = nextState.cards.find(c => c.gId === gId);
    if (card) { card.onSummon(nextState); }
  }

  private tapLand(nextState: TGameState, gId: string) {
    const card = nextState.cards.find(c => c.gId === gId);
    if (card) { card.onTap(nextState); }
  }

  private discardCard(nextState: TGameState, gId: string) {
    const card = nextState.cards.find(c => c.gId === gId);
    if (card && card.onDiscard) { card.onDiscard(nextState); }
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
        const manaStatus = checkMana(card.cast, playerA.manaPool);
        if (manaStatus === 'not enough') {
          card.status = 'summon:waitingMana';
          
        } else if (manaStatus === 'exact' || manaStatus === 'auto') {
          manaForUncolor = calcManaForUncolored(card.cast, playerA.manaPool);
          rightMana = true;
          
        } else if (manaStatus === 'manual') {
          rightMana = card.cast[0] <= manaForUncolor.reduce((v,a) => v + a, 0);
          if (!rightMana) { card.status = 'summon:selectingMana'; } // If there is not enough uncolor selected
        }

        if (rightMana) {
          spendMana(card.cast, playerA.manaPool, manaForUncolor);          
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
        const manaStatus = checkMana(card.cast, playerA.manaPool);
        if (manaStatus === 'not enough') {
          card.status = 'summon:waitingMana';
          
        } else if (manaStatus === 'exact' || manaStatus === 'auto') {
          manaForUncolor = calcManaForUncolored(card.cast, playerA.manaPool);
          rightMana = true;

        } else if (manaStatus === 'manual') {
          rightMana = card.cast[0] === manaForUncolor.reduce((v,a) => v + a, 0);
          if (!rightMana) { card.status = 'summon:selectingMana'; } // If there is not enough uncolor selected
        }

        if (rightMana) {
          // runEvent(nextState, gId, 'onTargetLookup');
          const { neededTargets, possibleTargets } = card.onTargetLookup(nextState); 

          if (neededTargets > possibleTargets.length) {
            console.log(`You can't summon ${card.name} because there are no targets to select`);
            this.cancelSummonOperations(nextState);
          }
          else if ((params.targets?.length || 0) < (neededTargets || 0)) { 
            card.status = 'summon:selectingTargets'; 
          }
          else {
            console.log(`SUMMONING ${card.name} (${params.gId}), manaForUncolor=${params.manaForUncolor}, targets=${params.targets}`);
            spendMana(card.cast, playerA.manaPool, manaForUncolor);
            card.status = 'summoning';
            card.targets = params.targets || [];
            this.addToSpellStack(nextState, card);
          }
        }

      }
    }
  }

  // Cancel any other ongoing summon:XXX operation for your
  private cancelSummonOperations(nextState: TGameState, exceptgId?: string) {
    const { handA } = this.getCards(nextState);
    handA.filter(c => c.gId !== exceptgId && c.status?.slice(0, 7) === 'summon:').forEach(c => c.status = null);
  }


  // ---------------------------------------------------- SPELL STACK ----------------------------------------------------

  // action: release-stack
  private releaseStack(nextState: TGameState) {
    const { playerA, playerB } = this.getPlayers(nextState);
    playerA.stackCall = false;

    if (playerB.stackCall) { // If you added spells, opponent may add more spells too. Llet him do it
      this.switchPlayerControl(nextState);

    } else { // If both stackCall are false (you didn't add any new spell), run the spell stack
      console.log('You are both done, RUN THE STACK of SPELLS');
      this.runSpellStack(nextState);
      if (nextState.phase === 'combat') { this.continueCombat(nextState); }
      // else {
      //   this.applyEffects(nextState);
      //   killDamagedCreatures(nextState);
      // }
    }
  }

  private addToSpellStack(nextState: TGameState, card: TGameCard) {
    const { playerA, playerB } = this.getPlayers(nextState);
    moveCard(nextState, card.gId, 'stack'); // Move playing card to the stack
    playerB.stackCall = true; // Activate opponent's stack call, so he gets control later to add more spells to the stack
    if (!playerA.stackCall) { this.switchPlayerControl(nextState); }  // stack initiator (you are just playing a spell)
  }

  private runSpellStack(nextState: TGameState) {
    const stack = nextState.cards.filter(c => c.location === 'stack').sort((a,b) => a.order > b.order ? -1 : 1); // inverse order ([max,...,min])
    stack.forEach(card => {
      if (card.location === 'stack') { 
        // runEvent(nextState, card.gId, 'onSummon');
        card.onSummon(nextState);
      }
    });
    this.applyEffects(nextState); // Recalculate the effects
    killDamagedCreatures(nextState); // Kill creatures if needed
    nextState.control = nextState.turn; // Return control to the turn player
  }


  // ---------------------------------------------------- COMBAT ----------------------------------------------------


  // action: select-attacking-creatur
  private selectAttackingCreature(nextState: TGameState, gId: string) {
    const { tableA } = this.getCards(nextState);
    const creature = tableA.find(c => c.gId === gId);
    if (creature) { creature.status = 'combat:attacking'; creature.isTapped = true; }
  }
  
  // action: cancel-attack
  private cancelAttack(nextState: TGameState) {
    const attackingCreatures = nextState.cards.filter(c => c.status === 'combat:attacking');
    attackingCreatures.forEach(card => {
      card.status = null;
      card.isTapped = false;
    });
  }

  // action: submit-attack
  private submitAttack(nextState: TGameState) {
    const { playerA, playerB, attackingPlayer, defendingPlayer } = this.getPlayers(nextState);
    nextState.subPhase = ESubPhase.attacking;
    defendingPlayer.stackCall = true; // Activate opponent's stack call, so he gets control to cast spells
    // attackingPlayer.stackCall = true; // You may also play spells
    this.switchPlayerControl(nextState, defendingPlayer);
  }
  
  // action: select-defending-creature
  private selectDefendingCreature(nextState: TGameState, params: TActionParams) {
    const { tableA } = this.getCards(nextState);
    const gId = params.gId || '';
    const creature = tableA.find(c => c.gId === gId);
    if (creature) {
      if (params.targets && params.targets.length) {
        creature.status = 'combat:defending';
        creature.blockingTarget = params.targets[0]; // For now only 1 blocker allowed

      } else {
        nextState.cards.filter(c => c.status === 'combat:selectingTarget').forEach(c => c.status = null); // unselect previous (if any)
        creature.status = 'combat:selectingTarget'; // Manually select the defending target

        // This needs to take in cosideration blocking patters (flying, color protection, ...)
        // const unblockedAttackers = nextState.cards.filter(c => {
        //   return c.status === 'combat:attacking' 
        //       && !nextState.cards.find(d => d.status === 'combat:defending' && d.blockingTarget === c.gId);
        // });
        // if (unblockedAttackers.length === 1) { // Automatically select the only none blocked attacker
        //   creature.status = 'combat:defending';
        //   creature.blockingTarget = unblockedAttackers[0].gId;
        // }
      }
    }
  }

  // action: cancel-defense
  private cancelDefense(nextState: TGameState) {
    const defendingCreatures = nextState.cards.filter(c => c.status === 'combat:defending' || c.status === 'combat:selectingTarget');
    defendingCreatures.forEach(card => card.status = null);
  }

  // action: submit-defense
  private submitDefense(nextState: TGameState) {
    const { attackingPlayer } = this.getPlayers(nextState);
    nextState.subPhase = ESubPhase.defending;
    attackingPlayer.stackCall = true; // Activate opponent's stack call, so he gets control to cast spells
    // defendingPlayer.stackCall = true; // You may also play spells
    this.switchPlayerControl(nextState, attackingPlayer);
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

  private runCombat(nextState: TGameState) {
    const { playerA, playerB, attackingPlayer, defendingPlayer } = this.getPlayers(nextState);
    const attackingCreatures = nextState.cards.filter(c => c.status === 'combat:attacking');
    const defendingCreatures = nextState.cards.filter(c => c.status === 'combat:defending');

    let totalDamage = 0;
    attackingCreatures.forEach(attackingCard => {
      const defendingCard = defendingCreatures.find(c => c.blockingTarget === attackingCard.gId);
      const attackerTxt = `Attacking ${attackingCard.gId} ${attackingCard.name} (${attackingCard.turnAttack}/${attackingCard.turnDefense})`;

      if (defendingCard) { // Creatre blocked by another
        defendingCard.turnDamage = attackingCard.turnAttack;
        attackingCard.turnDamage = defendingCard.turnAttack;
        
        const defenserTxt = `Defending ${defendingCard.gId} ${defendingCard.name} (${attackingCard.turnAttack}/${attackingCard.turnDefense})`;
        console.log(`${attackerTxt} -----> deals ${attackingCard.turnAttack} points of damage to ${defenserTxt}`);
        console.log(`${defenserTxt} -----> deals ${defendingCard.turnAttack} points of damage to ${attackerTxt}`);
        
      } else { // If the creature is not blocked
        console.log(`${attackerTxt} -----> deals ${attackingCard.turnAttack} points of damage to player${this.playerANum}`); // You are the defender
        totalDamage += (attackingCard.turnAttack || 0);
      }
    });

    defendingPlayer.life -= totalDamage; // None blocked creatures damage defending player

    nextState.subPhase = ESubPhase.afterCombat;
    attackingPlayer.stackCall = true;
    defendingPlayer.stackCall = true;
  }

  private endCombat(nextState: TGameState) {
    const { playerA, playerB, attackingPlayer, defendingPlayer } = this.getPlayers(nextState);
    killDamagedCreatures(nextState);  // Check those creatures that received more damage than defense, and kill them    
    nextState.cards.filter(c => c.status?.slice(0,6) === 'combat').forEach(card => {
      card.status = null;
      card.blockingTarget = null;
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
    killDamagedCreatures(nextState); // In case something dealt damage or changed creatures defense
  }

  // End the turn and reset all turn counters and values
  private endTurn(nextState: TGameState) {
    const { playerA, playerB, turnPlayer } = this.getPlayers(nextState);
    const { table, tableA } = this.getCards(nextState);
    turnPlayer.drawnCards = 0;
    turnPlayer.summonedLands = 0;
    nextState.turn = nextState.turn === '1' ? '2' : '1';  // change current player
    nextState.control = nextState.turn; // give control to the other player
    nextState.phase = EPhase.untap;
    tableA.filter(c => c.status === 'sickness').forEach(c => c.status = null); // Summon sickness ends
    table.filter(c => c.type === 'creature').forEach(c => c.turnDamage = 0); // Damage on creatures is reset

    nextState.effects = nextState.effects.filter(e => e.scope !== 'turn'); // Remove effects that last until the end of the turn

    // Check if a player is dead
    if (turnPlayer.life <= 0) { this.endGame(nextState, nextState.turn); return; }
    // if (playerA.life <= 0) { this.endGame(nextState, 'A'); return; }
    // if (playerB.life <= 0) { this.endGame(nextState, 'B'); return; }

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



  // ---------- EFFECTS ----------

  // This happens every time the state is modified (at the end of the reducer)
  applyEffects(nextState: TGameState) {
    console.log('Applying EFFECTS');

    // Reset all turnAttack / turnDefense
    nextState.cards.filter(c => c.type === 'creature').forEach(creature => {
      creature.turnAttack  = creature.attack || 0;
      creature.turnDefense = creature.defense || 0;
    });

    // Remove permanent effects from cards that no longer exist (on the table)
    nextState.effects = nextState.effects.filter(effect => {
      if (effect.scope !== 'permanent') { return true; }
      const refCard = nextState.cards.find(ref => ref.gId === effect.gId); // <- card that generated the effect
      return refCard && (refCard.location.slice(0,4) === 'tble' || refCard.location === 'stack');
    });

    // Apply effects
    nextState.effects.forEach(effect => {
      // runEvent(nextState, effect.gId, 'onEffect', { effectId: effect.id });
      // Find the logic on the card that generated the effect
      const card = nextState.cards.find(c => c.gId === effect.gId); 
      if (card) { extendCardLogic(card).onEffect(nextState, effect.id); }
    });

    // We can't do this here, because of afterCombat subphase (creatures should stay until the end of combat)
    // killDamagedCreatures(nextState); // In case an effect deals damage or changes creatures defense
  }




}


