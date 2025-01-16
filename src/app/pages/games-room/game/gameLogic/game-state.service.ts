import { Injectable } from '@angular/core';
import { Subject, Subscription } from 'rxjs';
import { AuthService } from '../../../../core/common/auth.service';
import { ShellService } from '../../../../shell/shell.service';
import { Firestore, QuerySnapshot, collection, doc, getDoc, getDocs, onSnapshot, setDoc, DocumentData, Unsubscribe } from '@angular/fire/firestore';
import { EPhase, TAction, TCard, TCardLocation, TGameState, TGameDBState, TGameCard, TActionParams, TCardType, TCardAnyLocation, ESubPhase, TCast, TActionCost, TPlayer, TEffect } from '../../../../core/types';
import { calcManaCost, calcManaForUncolored, checkMana, drawCard, endGame, getCards, getPlayers, killDamagedCreatures, moveCard, moveCardToGraveyard, spendMana, validateCost } from './game.utils';
import { GameOptionsService } from './game.options.service';
import { extendCardLogic } from './game.card-specifics';
import { BfDefer } from 'bf-ui-lib';
import { getTime } from '../../../../core/common/commons';
import { dbCards } from '../../../../core/dbCards';




@Injectable({ providedIn: 'root' })
export class GameStateService {
  library: Array<TCard> = [];
  libraryDef!: BfDefer;
  firstStateDef!: BfDefer;

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
  debugPanel = false;



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
    this.firstStateDef = new BfDefer();
  }

  loadLibrary() { // Load card library
    this.libraryDef = new BfDefer();
    getDocs(collection(this.firestore, 'cards')).then((ref: QuerySnapshot<DocumentData>) => {
      this.library = [];
      ref.forEach(doc => {
        const card = doc.data() as TCard;
        const cardProps = 'cast, color, name, image, text, type, attack, defense, '
                        + 'isFlying, isTrample, isFirstStrike, isWall, isHaste, colorProtection'
        const filteredCard = card.keyFilter(cardProps);
        this.library.push({ id: doc.id, ...filteredCard } as TCard);
      });
      // console.log(this.library);
      this.libraryDef.resolve()
    });
  }


  async activateGame(gameId: string) {
    this.gameId = gameId;
    await this.auth.profilePromise;
    await this.libraryDef.promise; // wait to have all the cards loaded

    if (this.gameDocSub) { this.gameDocSub(); } // unsubscribe if previous detected

    // Changes on the game document from Firebase
    this.gameDocSub = onSnapshot(doc(this.firestore, 'games', gameId), (docQuery: any) => {
      const source = docQuery.metadata.hasPendingWrites ? 'local' : 'server';
      const dbState = docQuery.data();
      // console.log('DB onSnapshot() from -->', source, nextState);
      
      if (!this.firstStateDef.status) { this.initState(dbState); } // First load of the game
      
      // Propagate changes from DB
      if (source === 'server') {
        console.log('DB onSnapshot(): New State from -->', source);
        
        if (!this.firstStateDef.status || this.state.seq === dbState.seq - 1) {
          // console.log('DB onSnapshot() --> New state from remote ACTION: ', dbState.lastAction);
          this.dbState$.next(dbState);

          // Find if there are future updates that came before this one
          let nextSeq = dbState.seq + 1;
          for (let t = 0; t < this.dbFutureStates.length; t++) {
            const futureState = this.dbFutureStates[t];
            if (futureState.seq === nextSeq) {
              console.warn('DB onSnapshot() --> New state from (stacked) ACTION: ', dbState.lastAction);
              this.dbState$.next(futureState); nextSeq++;
              delete this.dbFutureStates[t];
            }            
          }
          this.dbFutureStates = this.dbFutureStates.filter(v => !!v);
        }
        else if (this.state.seq < dbState.seq - 1) { // If there's more than 1 new state / action
          this.dbFutureStates.push(dbState); // This is a future update, we are missing previous updates (stack it and wait)
          this.dbFutureStates.sort((a, b) => a.seq < b.seq ? 1: -1);
          console.warn('DB onSnapshot() --> Disordered (not executed, stacked) ACTION:: ', dbState.lastAction);

        } else {
          console.error('THAT SHOULD NOT HAPPEN. state.seq=', this.state.seq, 'dbState.seq=', dbState.seq);
        }
      }
    });

    // Extend the raw DB state:  dbState$ ---> state$
    if (this.gameStateSub) { this.gameStateSub.unsubscribe(); }
    this.gameStateSub = this.dbState$.subscribe((dbState: TGameDBState) => {
      console.log('New State. Last action =', `${dbState.lastAction?.action}`, 'dbState:', dbState);
      this.state = this.options.calculate(this.convertfromDBState(dbState), this.playerANum);
      this.options.calculateEffectsFrom(this.state);
      this.options.calculateTargetsFrom(this.state);
      this.state$.next(this.state);
      // console.log('New State - Options =', state.options.map(o => `${o.action}:${o.params?.gId}`), state);
      if (!this.firstStateDef.status) { this.firstStateDef.resolve(); } // <--- First time we load the state
    });
  }

  deactivateGame() {
    if (this.gameDocSub) { this.gameDocSub(); }
    if (this.gameStateSub) { this.gameStateSub.unsubscribe(); }
    this.firstStateDef = new BfDefer();
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

  // Add fixed properties and extended functions for cards
  convertfromDBState(dbState: TGameDBState): TGameState {
    const state: TGameState = { ...dbState, options: [] };
    state.cards = state.cards.map(card => {
      const dbCard = dbCards.find(c => c.id === card.id);
      if (!dbCard) { console.error('CARD NOT FOUND in dbCards:', card); return card; }
      return extendCardLogic({ ...card, ...dbCard });
    });
    return state;
  }

  // Stripe out extended properties that do not need to be on DB
  convertToDBState(nextState: TGameState): TGameDBState {
    const dbState = nextState.keyFilter((v,k) => k !== 'options') as TGameDBState;
    const extFields = [
      // TCard
      'cast', 'color', 'image', 'text', 'type', 'price', 'attack', 'defense', 'border', 'maxInDeck', 'readyToPlay',
      'isWall', 'isFlying', 'isTrample', 'isFirstStrike', 'isHaste', 'canRegenerate', 'colorProtection',

      // Extended properties (extendCardLogic)
      'selectableAction', 'effectsFrom', 'targetOf', 'uniqueTargetOf',

      // Extended functions (extendCardLogic)
      'onSummon', 'onAbility', 'onDestroy', 'onDiscard', 'afterDamage', 'onEffect', 'onUpkeep',
      'isType', 'isColor', 'canUntap', 'canAttack', 'canDefend', 'targetBlockers', 
      'getSummonCost', 'getAbilityCost', 'getUpkeepCost', 'getCost',
    ]
    dbState.cards = dbState.cards.map(card => card.keyFilter((v,k) => !extFields.includes(k))) as Array<TGameCard>;

    // Loop dbState properties and find any that is not valid for FireBase (errors)
    // const checkProp = (path: string, prop: string, v: any) => {
    //   const vType = typeof v;
    //   if (v === undefined || (vType !== 'string' && vType !== 'number' && vType !== 'boolean' && v !== null && !Array.isArray(v))) {
    //     console.error('WRONG dbState property:', path, prop, v, vType);        
    //   }
    //   if (Array.isArray(v)) {
    //     v.filter(vv => vv === undefined).forEach(i => console.error('WRONG dbState property:', path, prop, v, vType));
    //   }
    // }
    // dbState.cards.forEach(c => { let prop: keyof TGameCard; for (prop in c) { checkProp('cards[].', prop, c[prop]); }; });
    // dbState.effects.forEach(c => { let prop: keyof TEffect; for (prop in c) { checkProp('effects[].', prop, c[prop]); }; });
    // let prop: keyof TPlayer;
    // for (prop in dbState.player1) { checkProp('player1.', prop, dbState.player1[prop]); }
    // for (prop in dbState.player2) { checkProp('player2.', prop, dbState.player2[prop]); }

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
    // const nextState = JSON.parse(JSON.stringify(this.state)) as TGameState;
    const nextState = this.convertfromDBState(this.convertToDBState(this.prevState)); // Extend specific logic functions on cards
    
    console.log('ACTION: ', action, ' ---> ', nextState.cards.find(c => c.gId === params?.gId)?.name, params);
    const gId = params?.gId || '';
    switch (action) {
      case 'start-game':                nextState.status = 'playing'; break;
      case 'skip-phase':                this.endPhase(nextState); break;
      case 'draw':                      this.draw(nextState);  break;
      case 'untap-card':                this.untapCard(nextState, gId); break;
      case 'untap-all':                 this.untapAll(nextState); break;
      case 'select-attacking-creature': this.selectAttackingCreature(nextState, gId); break;
      case 'select-defending-creature': this.selectDefendingCreature(nextState, params); break;
      case 'cancel-attack':             this.cancelAttack(nextState); break;
      case 'cancel-defense':            this.cancelDefense(nextState); break;
      case 'submit-attack':             this.continueCombat(nextState); break;
      case 'submit-defense':            this.continueCombat(nextState); break;
      case 'continue-combat':           this.continueCombat(nextState); break;
      case 'select-card-to-discard':    this.discardCard(nextState, gId); break;
      case 'burn-mana':                 this.burnMana(nextState); break;
      case 'summon-land':               this.summonLand(nextState, params); break;
      case 'summon-spell':              this.summonSpell(nextState, params); break;
      case 'trigger-ability':           this.triggerAbility(nextState, params); break;
      case 'release-stack':             this.releaseStack(nextState); break;
      case 'regenerate-creature':       this.triggerAbility(nextState, params); break;
      case 'cancel-regenerate':         this.cancelRegenerate(nextState); break;
      case 'pay-upkeep':                this.payUpkeep(nextState, params); break;
      case 'skip-upkeep':               this.skipUpkeep(nextState, params); break;
    }

    this.applyEffects(nextState); // Recalculate state based on current effects
    this.checkCreaturesThatRegenerate(nextState);



    nextState.seq += 1;
    nextState.lastAction = { action, params, player: this.playerANum, time: getTime() };

    // Update the state
    const dbState = this.convertToDBState(nextState);
    this.dbState$.next(dbState); // Local update of the state (before it's saved to DB)
    setDoc(doc(this.firestore, 'games', this.gameId), dbState).then(_ => {});

    // Save history
    const hActionId = 'action-' + (nextState.seq + '').padStart(4, '0');
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
    if (card && card.canUntap(nextState)) { card.isTapped = false; }
  }

  private untapAll(nextState: TGameState) {
    const { tableA } = this.getCards(nextState);
    tableA.filter(c => c.isTapped && c.canUntap(nextState)).forEach(card => card.isTapped = false);
  }

  private draw(nextState: TGameState) {
    drawCard(nextState, this.playerANum);
    this.getPlayers(nextState).playerA.drawnCards += 1;
  }


  private discardCard(nextState: TGameState, gId: string) {
    const card = nextState.cards.find(c => c.gId === gId);
    if (card) { card.onDiscard(nextState); }
  }

  private burnMana(nextState: TGameState) {
    const { playerA } = this.getPlayers(nextState);
    for (let t = 0; t < playerA.manaPool.length; t++) {
      playerA.life -= playerA.manaPool[t];
      playerA.manaPool[t] = 0;
    }
  }





  private summonLand(nextState: TGameState, params: TActionParams) {
    const card = nextState.cards.find(c => c.gId === params.gId);
    if (card) { card.onSummon(nextState); } // Lands do not go to the stack
  }


  private summonSpell(nextState: TGameState, params: TActionParams) {
    const { playerA } = this.getPlayers(nextState);
    const card = nextState.cards.find(c => c.gId === params.gId);
    const cost = card?.getSummonCost(nextState);
    if (card && cost) {
      const opStatus = validateCost(card, params, cost, playerA.manaPool);
      if (opStatus === 'ready') {
        console.log(`SUMMONING ${card.name} with params =`, params);
        this.payManaCost(nextState, params, cost, card); // Spend Cost    
        card.targets = params.targets || [];
        this.addToSpellStack(nextState, card);        
      }  
    }
  }


  private triggerAbility(nextState: TGameState, params: TActionParams) {
    const { playerA } = this.getPlayers(nextState);
    const card = nextState.cards.find(c => c.gId === params.gId);
    const cost = card?.getAbilityCost(nextState);
    if (card && cost) { 
      const opStatus = validateCost(card, params, cost, playerA.manaPool);
      if (opStatus === 'ready') { 
        console.log(`TRIGGERING ${card.name} ABILITY with params =`, params);
        this.payManaCost(nextState, params, cost, card); // Spend Cost   
        card.status = null;
        card.targets = params.targets || [];
        card.onAbility(nextState);
      }  
    }
  }

  private payManaCost(nextState: TGameState, params: TActionParams, cost: TActionCost, card: TGameCard) {
    const { playerA } = this.getPlayers(nextState);
    const totalManaCost = cost.mana.reduce((a,v) => a + v, 0);
    // console.log('Paying mana from pool:', cost.mana, params.manaExtra);
    // console.log('Mana pool before paying:', playerA.manaPool);
    if (totalManaCost > 0) {
      const manaForUncolor = params.manaForUncolor || calcManaForUncolored(cost.mana, playerA.manaPool);
      spendMana(cost.mana, playerA.manaPool, manaForUncolor);
    }
    if (cost.xMana && params.manaExtra) {
      for (let t = 0; t <= 5; t++) { playerA.manaPool[t] -= params.manaExtra[t]; } // Spend X Mana
      card.xValue = params.manaExtra?.reduce((v,a) => v + a, 0) || 0;
    }
    // console.log('Mana pool after paying:', playerA.manaPool);
  }



  // Cancel the regeneration of a creature and let it die
  private cancelRegenerate(nextState: TGameState) {
    const creatures = nextState.cards.filter(c => c.controller === this.playerANum && c.isDying);
    creatures.forEach(creature => {
      creature.isDying = false;
      moveCardToGraveyard(nextState, creature.gId);
    });
    nextState.control = nextState.turn; // Return control to the turn player
  }


  // ---------------------------------------------------- SPELL STACK ----------------------------------------------------

  private addToSpellStack(nextState: TGameState, card: TGameCard) {
    const { playerA, playerB } = this.getPlayers(nextState);
    if (!nextState.cards.find(c => c.location === 'stack')) { nextState.spellStackInitiator = this.playerANum; }
    moveCard(nextState, card.gId, 'stack'); // Move playing card to the stack
    playerB.stackCall = true; // Activate opponent's stack call, so he gets control later to add more spells to the stack
    if (!playerA.stackCall) { this.switchPlayerControl(nextState); }  // stack initiator (you are just playing a spell)
    
    else if (nextState.phase === 'combat') { // In case of casting spells during combat, run them 1 by 1
      playerA.stackCall = false;
      this.switchPlayerControl(nextState, playerB); 
    }
  }

  // action: release-stack
  private releaseStack(nextState: TGameState) {
    const { playerA, playerB } = this.getPlayers(nextState);
    playerA.stackCall = false;

    if (playerB.stackCall) { // If you added spells, opponent may add more spells too. Llet him do it
      this.switchPlayerControl(nextState);

    } else { // If both stackCall are false (you didn't add any new spell), run the spell stack
      console.log('You are both done, RUN THE STACK of SPELLS');
      const stack = nextState.cards.filter(c => c.location === 'stack').sort((a,b) => a.order > b.order ? -1 : 1); // inverse order ([max,...,min])
      stack.forEach(card => {
        if (card.location === 'stack') { // Leave this condition here (a counterspell may move the location while running the stack)
          card.onSummon(nextState);
        }
      });
      this.applyEffects(nextState);       // Recalculate the effects
      killDamagedCreatures(nextState);    // Kill creatures if needed
      nextState.control = nextState.spellStackInitiator || nextState.turn; // Return control to the initiator

      if (nextState.phase === 'combat') { // If all combat creatures died, end it
        const attackingCreatures = nextState.cards.filter(c => c.combatStatus === 'combat:attacking');
        if (!attackingCreatures.length) { this.endCombat(nextState); }
      }
    }
  }


  // ---------------------------------------------------- COMBAT ----------------------------------------------------


  // action: select-attacking-creatur
  private selectAttackingCreature(nextState: TGameState, gId: string) {
    const { tableA } = this.getCards(nextState);
    const creature = tableA.find(c => c.gId === gId);
    if (creature) { creature.combatStatus = 'combat:attacking'; creature.isTapped = true; }
  }
  
  // action: cancel-attack
  private cancelAttack(nextState: TGameState) {
    const attackingCreatures = nextState.cards.filter(c => c.combatStatus === 'combat:attacking');
    attackingCreatures.forEach(card => {
      card.combatStatus = null;
      card.isTapped = false;
    });
  }
  
  // action: select-defending-creature
  private selectDefendingCreature(nextState: TGameState, params: TActionParams) {
    const { tableA } = this.getCards(nextState);
    const gId = params.gId || '';
    const creature = tableA.find(c => c.gId === gId);
    if (creature) {
      const possibleBlockers = creature.targetBlockers(nextState);
      if (params.targets && params.targets.length) {
        const targetId = params.targets[0]; // For now only 1 blocker allowed
        if (possibleBlockers.includes(targetId)) {
          nextState.cards.filter(c => c.blockingTarget === targetId).forEach(c => { c.combatStatus = null; c.blockingTarget = null }); // unselect previous (if any)
          creature.combatStatus = 'combat:defending';
          creature.blockingTarget = params.targets[0]; 
        }

      } else {
        nextState.cards.filter(c => c.combatStatus === 'combat:selectingTarget').forEach(c => c.combatStatus = null); // unselect previous (if any)
        creature.combatStatus = 'combat:selectingTarget'; // Manually select the defending target

        // Automatically select the only none blocked attacker
        // const unblockedAttackers = nextState.cards
        //   .filter(att => att.combatStatus === 'combat:attacking' && possibleBlockers.includes(att.gId))
        //   .filter(att => !nextState.cards.find(def => def.blockingTarget === att.gId));
        // if (unblockedAttackers.length === 1) { 
        //   creature.combatStatus = 'combat:defending';
        //   creature.blockingTarget = unblockedAttackers[0].gId;
        // }
      }
    }
  }

  // action: cancel-defense
  private cancelDefense(nextState: TGameState) {
    const defendingCreatures = nextState.cards.filter(c => c.combatStatus === 'combat:defending' || c.combatStatus === 'combat:selectingTarget');
    defendingCreatures.forEach(card => { card.combatStatus = null; card.blockingTarget = null; });
  }

  // Advance combat subphases after the spell stack is released:
  // selectAttack --> attacking --> selectDefense --> beforeDamage --> afterDamage --> regenerate
  private continueCombat(nextState: TGameState) {
    const { attackingPlayer, defendingPlayer } = this.getPlayers(nextState);

    attackingPlayer.stackCall = false;
    defendingPlayer.stackCall = false;

    // If for whatever reason, the attacking creatures were killed by spells, end the combat
    const attackingCreatures = nextState.cards.filter(c => c.combatStatus === 'combat:attacking');
    if (!attackingCreatures.length) { this.endCombat(nextState); }

    if (nextState.subPhase === 'selectAttack') {
      nextState.subPhase = ESubPhase.attacking;

    } else if (nextState.subPhase === 'attacking' && nextState.control === attackingPlayer.num) {
      this.switchPlayerControl(nextState, defendingPlayer);

    } else if (nextState.subPhase === 'attacking' && nextState.control === defendingPlayer.num) {
      nextState.subPhase = ESubPhase.selectDefense;

    } else if (nextState.subPhase === 'selectDefense') {
      nextState.subPhase = ESubPhase.beforeDamage;

    } else if (nextState.subPhase === 'beforeDamage' && nextState.control === defendingPlayer.num) {
      this.switchPlayerControl(nextState, attackingPlayer);

    } else if (nextState.subPhase === 'beforeDamage' && nextState.control === attackingPlayer.num) {
      this.runCombat(nextState);

    } else if (nextState.subPhase === 'afterDamage' && nextState.control === attackingPlayer.num) {
      this.switchPlayerControl(nextState, defendingPlayer);

    } else if (nextState.subPhase === 'afterDamage' && nextState.control === defendingPlayer.num) {
      const regenerateStep = killDamagedCreatures(nextState);
      if (regenerateStep) { nextState.subPhase = ESubPhase.regenerate; }
      else { this.endCombat(nextState); }

    } else if (nextState.subPhase === 'regenerate') {
      this.endCombat(nextState);
    }
  }

  private runCombat(nextState: TGameState) {
    const { playerA, playerB, attackingPlayer, defendingPlayer } = this.getPlayers(nextState);
    const attackingCreatures = nextState.cards.filter(c => c.combatStatus === 'combat:attacking');
    const defendingCreatures = nextState.cards.filter(c => c.combatStatus === 'combat:defending');

    let totalDamage = 0;
    attackingCreatures.forEach(attackingCard => {
      const defendingCard = defendingCreatures.find(c => c.blockingTarget === attackingCard.gId);
      const attackerTxt = `Attacking ${attackingCard.gId} ${attackingCard.name} (${attackingCard.turnAttack}/${attackingCard.turnDefense})`;

      if (defendingCard) { // Creatre blocked by another
        const defenserTxt = `Defending ${defendingCard.gId} ${defendingCard.name} (${defendingCard.turnAttack}/${defendingCard.turnDefense})`;

        let damageToDefender = attackingCard.turnAttack; // Total damage the defending creature will receive
        let damageToAttacker = defendingCard.turnAttack; // Total damage the attacking creature will receive

        const maxDefense = defendingCard.turnDefense - defendingCard.turnDamage; // Max damage the defender can receive (>= of this value, it dies)
        let excessDamage = damageToDefender - maxDefense; // Damage exceding the defender's max defense

        // First Strike ability
        if (attackingCard.isFirstStrike && !defendingCard.isFirstStrike && damageToDefender >= maxDefense) {
          damageToAttacker = 0; // Attacking creature does not receive damage because it kills defender first strike
          console.log(`${attackerTxt} -----> kills ${defenserTxt} with FIRST STRIKE and receives no damage`);
        }
        if (defendingCard.isFirstStrike && !attackingCard.isFirstStrike) {
          if (damageToAttacker >= (attackingCard.turnDefense - attackingCard.turnDamage)) { 
            damageToDefender = 0; // Defending creature does not receive damage because it kills defender first strike
            excessDamage = 0;
            console.log(`${defenserTxt} -----> kills ${attackerTxt} with FIRST STRIKE and receives no damage`);
          } 
        }

        // Trample ability
        if (attackingCard.isTrample && excessDamage > 0) { 
          console.log(`${attackerTxt} -----> also deals the remaining ${excessDamage} points of damage to player ${defendingPlayer.name} (because of TRAMPLE)`);
          damageToDefender -= excessDamage;
          totalDamage += excessDamage;
        }

        defendingCard.turnDamage += damageToDefender;
        attackingCard.turnDamage += damageToAttacker;
        console.log(`${attackerTxt} -----> deals ${damageToDefender} points of damage to ${defenserTxt}`);
        console.log(`${defenserTxt} -----> deals ${damageToAttacker} points of damage to ${attackerTxt}`);
        
      } else { // If the creature is not blocked
        console.log(`${attackerTxt} -----> deals ${attackingCard.turnAttack} points of damage to player ${defendingPlayer.name}`);
        totalDamage += (attackingCard.turnAttack || 0);
      }
    });

    defendingPlayer.life -= totalDamage; // None blocked creatures damage defending player

    nextState.subPhase = ESubPhase.afterDamage;
  }

  private endCombat(nextState: TGameState) {
    const { attackingPlayer } = this.getPlayers(nextState);
    nextState.cards.filter(c => c.combatStatus || c.blockingTarget).forEach(card => {
      card.combatStatus = null;
      card.blockingTarget = null;
      card.afterDamage(nextState);
    });
    this.switchPlayerControl(nextState, attackingPlayer);
    this.endPhase(nextState);
  }

  // In case a creature is killed and can be regenerate, give control to the creature's player
  // In case there are creatures to regenerate from both players, start with those of player1
  private checkCreaturesThatRegenerate(nextState: TGameState) {    
    const regenerateCreature2 = nextState.cards.filter(c => c.controller === '2').find(c => c.canRegenerate && c.isDying);
    const regenerateCreature1 = nextState.cards.filter(c => c.controller === '1').find(c => c.canRegenerate && c.isDying);
    if (regenerateCreature2) { nextState.control = regenerateCreature2.controller; }
    if (regenerateCreature1) { nextState.control = regenerateCreature1.controller; }
    if (nextState.phase === 'combat' && nextState.subPhase === 'regenerate' && !regenerateCreature1 && !regenerateCreature2) {
      this.endCombat(nextState);
    }
  }


  // ------------------------ UpKeep --------------------------------


  // Once we change to upkeep, build the player's upkeepQueue[] 
  private generateUpkeep(nextState: TGameState) {
    const { table, tableA, tableB } = this.getCards(nextState);
    const { playerA, playerB } = this.getPlayers(nextState);

    table.forEach(card => card.waitingUpkeep = false); // Clear all first

    // Select those card with upkeep that applies to you (yours, opponents + both)
    tableA.filter(c => c.upkeepPlayer === 'A' || c.upkeepPlayer === 'AB').forEach(card => {
      const cost = card.getUpkeepCost(nextState);
      if (cost) {
        console.log('Activating upkeep for', card.gId, card.name, '<-- your card');
        card.waitingUpkeep = true;
      }
    });
    tableB.filter(c => c.upkeepPlayer === 'B' || c.upkeepPlayer === 'AB').forEach(card => {
      const cost = card.getUpkeepCost(nextState);
      if (cost) {
        console.log('Activating upkeep for', card.gId, card.name, '<-- opponents card');
        card.waitingUpkeep = true;
      }
    });
  }


  private payUpkeep(nextState: TGameState, params: TActionParams) {
    const { playerA } = this.getPlayers(nextState);
    const { unresolvedUpkeeps } = this.getCards(nextState);

    const card = unresolvedUpkeeps.find(q => q.gId === params?.gId);
    const cost = card?.getUpkeepCost(nextState);
    if (card && cost) { 
      const opStatus = validateCost(card, params, cost, playerA.manaPool);
      if (opStatus === 'ready') { 
        console.log(`Paying ${card.name} upkeep with params =`, params);
        this.payManaCost(nextState, params, cost, card); // Spend Cost
        card.onUpkeep(nextState, false, params.targets);
        card.waitingUpkeep = false;
      }  
    }
  }

  private skipUpkeep(nextState: TGameState, params: TActionParams) {
    const { unresolvedUpkeeps } = this.getCards(nextState);
    const card = unresolvedUpkeeps.find(q => q.gId === params?.gId);
    if (card) {
      card.onUpkeep(nextState, true);
      card.waitingUpkeep = false;
    }
  }


  // ----------------------------------------------------------------------------------

  // Advances the phase for the given state, or ends the turn
  private endPhase(nextState: TGameState) {
    // nextState.opStack = []; // Cancel all ongoing card operations

    switch (nextState.phase) {
      case EPhase.untap:    nextState.phase = EPhase.upkeep; this.generateUpkeep(nextState); break;
      case EPhase.upkeep:   nextState.phase = EPhase.draw; break;
      case EPhase.draw:     nextState.phase = EPhase.pre; break;
      case EPhase.pre:      nextState.phase = EPhase.combat; break;
      case EPhase.combat:   nextState.phase = EPhase.post; break;
      case EPhase.post:     nextState.phase = EPhase.discard; break;
      case EPhase.discard:  nextState.phase = EPhase.end; break;
      case EPhase.end:      this.endTurn(nextState); break;
    }

    // That shouldn't happen, but in case there are creatures not regenerater or dead, destroy them
    nextState.cards.filter(c => c.canRegenerate && c.isDying).forEach(creature => {
      creature.isDying = false;
      moveCardToGraveyard(nextState, creature.gId);
    });

    // If starting combat phase, init sub-phase
    nextState.subPhase = null;
    if (nextState.phase === EPhase.combat) { nextState.subPhase = ESubPhase.selectAttack; }
    killDamagedCreatures(nextState); // In case something dealt damage or changed creatures defense
  }

  // End the turn and reset all turn counters and values
  private endTurn(nextState: TGameState) {
    const { playerA, playerB, turnPlayer } = this.getPlayers(nextState);
    const { table, tableA } = this.getCards(nextState);

    // Check if a player is dead
    if (turnPlayer.life <= 0) { endGame(nextState, turnPlayer.num); return; }
    
    // Remove effects that last until the end of the turn
    nextState.effects = nextState.effects.filter(e => e.scope !== 'turn');

    // Set new turn values
    turnPlayer.drawnCards = 0;
    turnPlayer.summonedLands = 0;
    nextState.turn = nextState.turn === '1' ? '2' : '1';  // change current player
    nextState.control = nextState.turn; // give control to the other player
    nextState.phase = EPhase.untap;
    tableA.filter(c => c.status === 'sickness').forEach(c => c.status = null); // Summon sickness ends
    table.filter(c => c.isType('creature')).forEach(c => c.turnDamage = 0); // Damage on creatures is reset

    const newTurnPlayer = this.getPlayers(nextState).turnPlayer;

    // Apply end turn effects, and then remove them
    nextState.effects.filter(e => e.scope === 'endTurn').forEach(effect => {
      const card = nextState.cards.find(c => c.gId === effect.gId); 
      if (card) { card.onEffect(nextState, effect.id); }
    });
    nextState.effects = nextState.effects.filter(e => e.scope !== 'endTurn');
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
    // console.log('Applying EFFECTS');

    // Reset all turnAttack / turnDefense
    nextState.cards.filter(c => c.isType('creature')).forEach(creature => {
      creature.turnAttack  = creature.attack || 0;
      creature.turnDefense = creature.defense || 0;
      creature.turnLandWalk = creature.landWalk;
    });

    // Remove permanent effects from cards that no longer exist (on the table)
    nextState.effects = nextState.effects.filter(effect => {
      if (effect.scope !== 'permanent') { return true; }
      const refCard = nextState.cards.find(ref => ref.gId === effect.gId); // <- card that generated the effect
      return refCard && (refCard.location.slice(0,4) === 'tble' || refCard.location === 'stack');
    });

    // Apply permenent and turn effects
    nextState.effects.filter(e => e.scope === 'permanent' || e.scope === 'turn').forEach(effect => {
      // runEvent(nextState, effect.gId, 'onEffect', { effectId: effect.id });
      // Find the logic on the card that generated the effect
      const card = nextState.cards.find(c => c.gId === effect.gId); 
      if (card) { card.onEffect(nextState, effect.id); }
    });

    // We can't do this here, because of afterDamage subphase (creatures should stay until the end of combat)
    // killDamagedCreatures(nextState); // In case an effect deals damage or changes creatures defense
  }




}


