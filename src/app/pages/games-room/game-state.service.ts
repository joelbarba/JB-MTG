import { Injectable } from '@angular/core';
import { Subject, Subscription } from 'rxjs';
import { AuthService } from '../../core/common/auth.service';
import { ShellService } from '../../shell/shell.service';
import { Firestore, QuerySnapshot, collection, doc, getDoc, getDocs, onSnapshot, setDoc, DocumentData, Unsubscribe } from '@angular/fire/firestore';
import { EPhase, TAction, TCard, TCardLocation, TGameState, TGameDBState, TGameCard, TActionParams, TCardType, TCardAnyLocation, ESubPhase, TCast, TActionCost } from '../../core/types';
import { calcManaCost, calcManaForUncolored, checkMana, drawCard, endGame, getCards, getPlayers, killDamagedCreatures, moveCard, moveCardToGraveyard, spendMana, validateCost } from './game/gameLogic/game.utils';
import { GameOptionsService } from './game/game.options.service';
import { extendCardLogic } from './game/gameLogic/game.card-specifics';
import { BfDefer } from 'bf-ui-lib';
import { getTime } from '../../core/common/commons';
import { dbCards } from '../../core/dbCards';




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


  // This is to interact accross game components (should be in an independent service actually)
  hoverCard$ = new Subject<TGameCard | null>;
  effectsBadge$ = new Subject<{ card: TGameCard, ev: MouseEvent }>;


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
        
        if (!this.firstStateDef.status || this.state.id === dbState.id - 1) {
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
      'onSummon', 'onAbility', 'onDestroy', 'onDiscard', 'afterCombat', 'onEffect',
      'isType', 'isColor', 'canAttack', 'canDefend', 'targetBlockers', 'getSummonCost', 'getAbilityCost',
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
      case 'cancel-attack':             this.cancelAttack(nextState); break;
      case 'submit-attack':             this.submitAttack(nextState); break;
      case 'select-defending-creature': this.selectDefendingCreature(nextState, params); break;
      case 'cancel-defense':            this.cancelDefense(nextState); break;
      case 'submit-defense':            this.submitDefense(nextState); break;
      case 'select-card-to-discard':    this.discardCard(nextState, gId); break;
      case 'burn-mana':                 this.burnMana(nextState); break;
      case 'summon-land':               this.summonLand(nextState, params); break;
      // case 'summon-creature':           this.summonSpell(nextState, params); break;
      case 'summon-spell':              this.summonSpell(nextState, params); break;
      case 'trigger-ability':           this.triggerAbility(nextState, params); break;
      // case 'update-op':                 this.updateCardOperation(nextState, params); break;
      // case 'cancel-op':                 this.cancelCardOperation(nextState); break;
      case 'release-stack':             this.releaseStack(nextState); break;
      case 'regenerate-creature':       this.triggerAbility(nextState, params); break;
      case 'cancel-regenerate':         this.cancelRegenerate(nextState); break;
    }

    this.applyEffects(nextState); // Recalculate state based on current effects
    this.checkCreaturesThatRegenerate(nextState);



    nextState.id += 1;
    nextState.lastAction = { action, params, player: this.playerANum, time: getTime() };

    // Update the state
    const dbState = this.convertToDBState(nextState);
    this.dbState$.next(dbState); // Local update of the state (before it's saved to DB)
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
    
        // Spend Cost
        const totalManaCost = cost.mana.reduce((a,v) => a + v, 0);
        if (totalManaCost > 0) { spendMana(cost.mana, playerA.manaPool, params.manaForUncolor); }
        if (cost.xMana && params.manaExtra) {
          spendMana(params.manaExtra, playerA.manaPool);
          card.xValue = params.manaExtra.reduce((v,a) => v + a, 0) || 0;
        }
    
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
    
        // Spend Cost
        const totalManaCost = cost.mana.reduce((a,v) => a + v, 0);
        if (totalManaCost > 0) { spendMana(cost.mana, playerA.manaPool, params.manaForUncolor); }
        if (cost.xMana && params.manaExtra) {
          spendMana(params.manaExtra, playerA.manaPool);
          card.xValue = params.manaExtra?.reduce((v,a) => v + a, 0) || 0;
        }
   
        card.status = null;
        card.targets = params.targets || [];
        card.onAbility(nextState);
      }  
    }
  }


  // When reserving mana or targets of the current operation, save these values
  // private updateCardOperation(nextState: TGameState, params: TActionParams) {
  //   const op = nextState.opStack.at(-1);
  //   if (op) {
  //     if (params.manaForUncolor) { op.manaForUncolor = params.manaForUncolor; }
  //     if (params.manaExtra)      { op.manaExtra      = params.manaExtra; }
  //     if (params.targets)        { op.targets        = params.targets; }
  //   }
  // }

  // private summonSpellOld(nextState: TGameState, params: TActionParams, tableDirectly = false) {
  //   const { playerA, playerB } = this.getPlayers(nextState);

  //   const gId = params?.gId || '';
  //   let manaForUncolor = params.manaForUncolor || [0,0,0,0,0,0];

  //   const addOpStack = (status: TCardOpStatus) => {
  //     removeOpStack(); // If there is an existing operation with the same card, remove it
  //     nextState.opStack.push({
  //       gId, opAction: 'summon', status, targets: [],
  //       manaForUncolor: [0,0,0,0,0,0], manaExtra: [0,0,0,0,0,0]
  //     });
  //   };
  //   const removeOpStack = () => {
  //     const op = nextState.opStack.find(c => c.gId === gId);
  //     if (op) { nextState.opStack.splice(nextState.opStack.indexOf(op), 1); }
  //   }


  //   const card = this.checkCard(nextState, gId, { location: 'hand' });
  //   if (card) {
  //     const summonCost = card.getSummonCost(nextState);
  //     if (summonCost) {

  //       let rightMana = true; // Whether you have the right mana in your mana pool
  //       const totalManaCost = summonCost.mana.reduce((v,a) => v + a, 0);

  //       if (totalManaCost) {          
  //         const manaStatus = checkMana(summonCost.mana, playerA.manaPool);
  //         if (manaStatus === 'exact' || manaStatus === 'auto') {
  //           manaForUncolor = calcManaForUncolored(summonCost.mana, playerA.manaPool);

  //         } else if (manaStatus === 'not enough') {
  //           addOpStack('waitingMana');
  //           rightMana = false;            

  //         } else if (manaStatus === 'manual') {
  //           rightMana = summonCost.mana[0] === manaForUncolor.reduce((v,a) => v + a, 0);
  //           if (!rightMana) { addOpStack('selectingMana'); } // If there is not enough uncolor selected
  //         }
  //       }

  //       if (rightMana) { // && (!summonCost.tap || !card.isTapped)) { No tap cost for summoning

  //         if ((summonCost.neededTargets || 0) > (summonCost.possibleTargets || []).length) {             
  //           console.log(`You can't summon ${card.name} because there are no targets to select`);
  //           removeOpStack(); // Cancel current operation
  //         }
  //         else if ((params.targets?.length || 0) < (summonCost.neededTargets || 0)) { 
  //           if (summonCost.customDialog) { card.customDialog = summonCost.customDialog; }
  //           addOpStack('selectingTargets');
  //         }
  //         else {
  //           console.log(`SUMMONING ${card.name} (${params.gId}), manaForUncolor=${params.manaForUncolor}, targets=${params.targets}`);
  //           if (totalManaCost > 0) { spendMana(summonCost.mana, playerA.manaPool, manaForUncolor); }            
  //           removeOpStack(); // complete current operation
  //           card.status = 'summoning';
  //           card.targets = params.targets || [];
  //           if (tableDirectly) {
  //             card.onSummon(nextState); // Lands do not go to the stack but to the table directly
  //           } else {
  //             this.addToSpellStack(nextState, card);
  //           }
  //         }
  //       }

  //     }
  //   }
  // }


  // private triggerAbilityOld(nextState: TGameState, params: TActionParams) {
  //   const { playerA, playerB } = this.getPlayers(nextState);

  //   const gId = params?.gId || '';
  //   let manaForUncolor = params.manaForUncolor || [0,0,0,0,0,0];

  //   const addOpStack = (status: TCardOpStatus) => {
  //     removeOpStack(); // If there is an existing operation with the same card, remove it
  //     nextState.opStack.push({
  //       gId, opAction: 'ability', status, targets: [],
  //       manaForUncolor: [0,0,0,0,0,0], manaExtra: [0,0,0,0,0,0]
  //     });
  //   };
  //   const removeOpStack = () => {
  //     const op = nextState.opStack.find(c => c.gId === gId);
  //     if (op) { nextState.opStack.splice(nextState.opStack.indexOf(op), 1); }
  //   }


  //   const card = nextState.cards.find(c => c.gId === gId);
  //   if (card) {
  //     const abilityCost = card.getAbilityCost(nextState);
  //     if (abilityCost) {

  //       let rightMana = true;
  //       const totalManaCost = abilityCost.mana.reduce((v,a) => v + a, 0);

  //       if (totalManaCost) {
  //         const manaStatus = checkMana(abilityCost.mana, this.playerA().manaPool);
          
  //         if (manaStatus === 'exact' || manaStatus === 'auto') {
  //           manaForUncolor = calcManaForUncolored(abilityCost.mana, playerA.manaPool);
  //         }
  //         else if (manaStatus === 'not enough') {
  //           addOpStack('waitingMana');
  //           rightMana = false;
  //         }
  //         else if (manaStatus === 'manual') {
  //           rightMana = abilityCost.mana[0] <= manaForUncolor.reduce((v,a) => v + a, 0);
  //           if (!rightMana) { addOpStack('selectingMana'); } // If there is not enough uncolor selected
  //         }
  //       }

  //       if (rightMana && (!abilityCost.tap || !card.isTapped)) {

  //         if ((abilityCost.neededTargets || 0) > (abilityCost.possibleTargets || []).length) {             
  //           console.log(`You can't use ${card.name} because there are no targets to select`);
  //           removeOpStack(); // Cancel current operation
  //         }
  //         else if ((params.targets?.length || 0) < (abilityCost.neededTargets || 0)) { 
  //           if (abilityCost.customDialog) { card.customDialog = abilityCost.customDialog; }
  //           addOpStack('selectingTargets');
  //         }
  //         else {
  //           card.targets = params.targets || [];
  //           if (totalManaCost > 0) { spendMana(abilityCost.mana, playerA.manaPool, manaForUncolor); }
  //           removeOpStack(); // complete current operation
  //           card.onAbility(nextState); // It may not always tap the card, but trigger the ability
  //           card.status = null;
  //         }
  //       }

  //     }
  //   }
  // }

  // Cancel the latest ongoing card operation
  // private cancelCardOperation(nextState: TGameState) {
  //   const card = nextState.cards.find(c => c.gId === nextState.opStack.at(-1)?.gId);
  //   if (card) { card.customDialog = null; } // Remove possible dialogs on card operation
  //   nextState.opStack.pop();
  // }


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
        card.onSummon(nextState);
      }
    });
    this.applyEffects(nextState);       // Recalculate the effects
    killDamagedCreatures(nextState);    // Kill creatures if needed
    nextState.control = nextState.turn; // Return control to the turn player
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
    const attackingCreatures = nextState.cards.filter(c => c.combatStatus === 'combat:attacking');
    if (!attackingCreatures.length) { this.endCombat(nextState); }

    if (nextState.subPhase === 'attacking') {
      nextState.subPhase = ESubPhase.selectDefense;
      this.switchPlayerControl(nextState, defendingPlayer);

    } else if (nextState.subPhase === 'defending') {
      this.runCombat(nextState);
      this.switchPlayerControl(nextState, attackingPlayer);

    } else if (nextState.subPhase === 'afterCombat') {
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

    nextState.subPhase = ESubPhase.afterCombat;
    attackingPlayer.stackCall = true;
    defendingPlayer.stackCall = true;
  }

  private endCombat(nextState: TGameState) {
    const { attackingPlayer } = this.getPlayers(nextState);
    nextState.cards.filter(c => c.combatStatus || c.blockingTarget).forEach(card => {
      card.combatStatus = null;
      card.blockingTarget = null;
      card.afterCombat(nextState);
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





  // ----------------------------------------------------------------------------------

  // Advances the phase for the given state, or ends the turn
  private endPhase(nextState: TGameState) {
    // nextState.opStack = []; // Cancel all ongoing card operations

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

    // We can't do this here, because of afterCombat subphase (creatures should stay until the end of combat)
    // killDamagedCreatures(nextState); // In case an effect deals damage or changes creatures defense
  }




}


