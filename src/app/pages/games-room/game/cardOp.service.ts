import { Injectable } from '@angular/core';
import { TAction, TActionParams, TCardOpStatus, TCast, TGameCard } from '../../../core/types';
import { GameStateService } from '../game-state.service';
import { calcManaCost, calcManaForUncolored, checkMana, getAvailableMana, spendMana } from './gameLogic/game.utils';


@Injectable({ providedIn: 'root' })
export class CardOpService {

  gId = '';
  opAction: 'summon' | 'ability' = 'summon';
  status: 'off' | TCardOpStatus = 'off';

  action: TAction = 'summon-spell';
  params: TActionParams = {
    gId            : '',
    // manaToUse      : [0,0,0,0,0,0], // Mana to be used for the operation
    manaForUncolor : [0,0,0,0,0,0], // What mana of the manaPool will be used for uncolored
    manaExtra      : [0,0,0,0,0,0], // Extra mana selection (apart from the cast) for X
    targets        : [],
  };

  title = '';
  text = '';
  card?: TGameCard;
  showSummonBtn = false;
  minimized = false;
  playerNum   : '1' | '2' = '1';
  playerLetter: 'A' | 'B' = 'A';

  // This variables are never used to trigger actions, 
  // only to show the mana pool - reserved mana & other temporary info panels
  manaCost    : TCast = [0,0,0,0,0,0]; // Total mana cost of the op's action
  manaReserved: TCast = [0,0,0,0,0,0]; // Mana currently reserved for the operation (colored + manaForUncolor)
  manaLeft    : TCast = [0,0,0,0,0,0]; // Remaining Mana still needed (total - reserved) <-- Only when 'selectingMana'
  manaNeeded  : TCast = [0,0,0,0,0,0]; // manaCost - available in the pool (to show next to mainInfo)

  prevManaPool?: TCast;    // Mana pool of the previous state (to calculate delta)
  displayExtraManaDialog = false;


  constructor(private game: GameStateService) {}

  update() { // To run every state change
    const state = this.game.state;
    this.displayExtraManaDialog = false;
    
    if (!state.opStack.length || state.control !== this.game.playerANum) {
      if (this.status !== 'off') { this.turnOff(); } // If all operations have finished, turn it off

    } else { // If there are ongoing operations
      
      const currOp = state.opStack.at(-1); // If a new operation is detected, start it
      if (this.status === 'off' || this.gId !== currOp?.gId || this.status !== currOp?.status) { this.startNewOp(); }

      // Update params from state --- to --> params{}
      if (currOp?.isExtraManaReady) { this.params.isExtraManaReady = currOp.isExtraManaReady; }
      if (currOp?.manaForUncolor)   { this.params.manaForUncolor   = [...currOp.manaForUncolor]; }
      if (currOp?.manaExtra)        { this.params.manaExtra        = [...currOp.manaExtra]; }
      if (currOp?.targets)          { this.params.targets          = [...currOp.targets]; }

      // If an ongoing waiting mana operation, try to use the current mana pool
      if (this.status === 'waitingMana') { this.tryToAction(); }

      // If collecting extra mana
      if (this.status === 'waitingExtraMana') {
        this.showSummonBtn = true;

        // Calculate the manaReserved[] for the fixed cost
        const availableManaInThePool = getAvailableMana(this.game.state, this.game.playerA().manaPool, this.gId);
        const extraMana = this.params.manaExtra || [0,0,0,0,0,0];
        for (let t = 0; t <= 5; t++) { availableManaInThePool[t] -= extraMana[t]; }
        const { manaStatus, totalManaToUse } = calcManaCost(this.manaCost, availableManaInThePool, this.params.manaForUncolor);
        if (manaStatus === 'not enough') { console.error('There is no enough mana. That should not happen'); }
        if (manaStatus === 'needs selection') { console.error('Needs manaForUncolor selection. That should not happen'); }
        this.manaReserved = totalManaToUse;

        // If the previous state action added 1 mana to the mana pool, automatically reserve it as extra mana
        if (this.prevManaPool) {
          const manaPool = this.game.playerA().manaPool;
          const diffMana = this.prevManaPool.map((prevMana, ind) => manaPool[ind] - prevMana);
          // console.log('prevManaPool=', this.prevManaPool, ',  manaPool=', manaPool, ',  diffMana=', diffMana);
          if (diffMana.reduce((a, v) => a + v, 0) === 1) { // If 1 new mana was added to your mana pool
            const poolNum = diffMana.reduce((a, v, i) => v ? i : a, 0);
            setTimeout(() => this.reserveExtraMana(poolNum));
            console.log('New mana added to your pool. Using it for extra mana. manaExtra=', this.params.manaExtra);
          }
        }

        this.displayExtraManaDialog = this.card?.controller === this.game.playerANum;
      }
    }


    // Remember the previous value of your mana pool
    this.prevManaPool = [...this.game.playerA().manaPool];
    this.updateDisplayManaPool();
    // console.log('manaReserved', this.manaReserved);
    // console.log('manaExtra', this.params.manaExtra, state.opStack.at(-1)?.manaExtra);
  }


  displayManaPool: TCast = [0,0,0,0,0,0];
  updateDisplayManaPool() {
    // Mana Pool - (cost + extra) for all opStack[] operations (except the current one)
    this.displayManaPool = getAvailableMana(this.game.state, this.game.playerA().manaPool, this.gId);
    const extraMana = this.params.manaExtra || [0,0,0,0,0,0];
    for (let t = 0; t <= 5; t++) {
      this.displayManaPool[t] -= this.manaReserved[t];
      this.displayManaPool[t] -= extraMana[t];
    }
    console.log('Mana Pool =', this.prevManaPool, ', displayManaPool =', this.displayManaPool);
  }

  reserveExtraMana(poolNum: number) {
    if (!this.params.manaExtra) { this.params.manaExtra = [0,0,0,0,0,0]; }
    const manaInPool = this.game.playerA().manaPool[poolNum];
    const reserved = this.manaReserved[poolNum] + this.params.manaExtra[poolNum];
    if (manaInPool > reserved) {
      this.params.manaExtra[poolNum] += 1;
      this.game.action('update-op', this.params);
    }
  }

  reserveAllPoolForExtra() {
    if (!this.params.manaExtra) { this.params.manaExtra = [0,0,0,0,0,0]; }
    const prevTotalExtra = this.params.manaExtra.reduce((a,v) => a + v, 0);
    const reserved = this.params.manaExtra.map((mana, pool) => mana + this.manaReserved[pool]);
    this.game.playerA().manaPool.forEach((manaFromPool, pool) => {
      const availableMana = manaFromPool - reserved[pool];
      if (availableMana > 0 && this.params.manaExtra) { this.params.manaExtra[pool] += availableMana; } 
    });
    if (prevTotalExtra < this.params.manaExtra.reduce((a,v) => a + v, 0)) {
      this.game.action('update-op', this.params);
    }
  }

  submitExtraMana() {
    this.turnOff();
    this.params.isExtraManaReady = true;
    this.game.action(this.action, this.params);
  }


  startNewOp() {
    const state = this.game.state;
    const currOp = state.opStack.at(-1);

    if (currOp) {
      this.gId            = currOp.gId;
      this.opAction       = currOp.opAction;
      this.status         = currOp.status;

      this.card = state.cards.find(c => c.gId === this.gId);
      if (!this.card) { return console.error('Card not found', this.gId); }

      this.params = { gId: currOp.gId };
      this.action = this.card.isType('creature') ? 'summon-creature' : 'summon-spell';

      const cost = currOp.opAction === 'summon' ? this.card.getSummonCost(state) : this.card.getAbilityCost(state);

      this.manaCost      = [...cost?.mana || [0,0,0,0,0,0]]; // Total cost
      this.manaLeft      = [...cost?.mana || [0,0,0,0,0,0]]; // Remaining mana left to summon
      this.manaNeeded    = [...cost?.mana || [0,0,0,0,0,0]]; // Remaining mana left to summon
      this.manaReserved  = [0,0,0,0,0,0];  // Mana temporarily reserved to summon
      this.minimized     = false;
      this.showSummonBtn = false;
      this.playerNum = this.card.controller;
      this.playerLetter = this.card.controller === this.game.playerANum ? 'A' : 'B';

      if (currOp.opAction === 'summon')  { this.title = `Summoning ${this.card.name}`; }      
      if (currOp.opAction === 'ability') { this.title = `Using ${this.card.name}`; }      


      if (currOp.status === 'waitingMana') {
        this.text = `You still need to generate: `;
      }
      else if (currOp.status === 'selectingMana') {
        this.text = `Please select the mana from your mana pool you want to use to summon ${this.card.name}`;
        this.autoReserveColoredMana();
      }
      else if (currOp.status === 'waitingExtraMana' || currOp.status === 'selectingExtraMana') {
        this.text = `Add extra mana for ${this.card.name}`;
      }
      else if (currOp.status === 'selectingTargets') {
        this.text = `Select target`;
      }
    }
  }


  autoReserveColoredMana() { // Automatically reserve colored mana
    const playerA = this.game.playerA();
    if (this.card) {
      for (let t = 0; t < Math.min(playerA.manaPool[1], this.manaCost[1]); t++) { this.reserveMana(1); }
      for (let t = 0; t < Math.min(playerA.manaPool[2], this.manaCost[2]); t++) { this.reserveMana(2); }
      for (let t = 0; t < Math.min(playerA.manaPool[3], this.manaCost[3]); t++) { this.reserveMana(3); }
      for (let t = 0; t < Math.min(playerA.manaPool[4], this.manaCost[4]); t++) { this.reserveMana(4); }
      for (let t = 0; t < Math.min(playerA.manaPool[5], this.manaCost[5]); t++) { this.reserveMana(5); }
    }
  }


  // Select one mana (manaReserved) from the mana pool to use the operation action
  // This only applies when 'selectingMana' for uncolored (manaForUncolor)
  reserveMana(poolNum: number) {
    if (poolNum > 0 && this.manaLeft[poolNum] > 0) { // Use it as colored mana
      this.manaLeft[poolNum] -= 1;
      this.manaReserved[poolNum] += 1;
    }
    else if (this.manaLeft[0] > 0)  { // Use it as uncolored mana
      this.manaLeft[0] -= 1;
      this.manaReserved[poolNum] += 1;
      if (!this.params?.manaForUncolor) { this.params.manaForUncolor = [0,0,0,0,0,0]; }
      this.params.manaForUncolor[poolNum] += 1;
    }
    // else { return; } // Unusable (can't reserve more mana than needed)
    this.showSummonBtn = this.manaLeft.reduce((a, v) => a + v, 0) <= 0;
    this.updateDisplayManaPool();
  }
  


  

  tryToAction() {
    console.log('tryToAction');
    if (!this.card) { return; }

    // Mana Pool - (cost + extra) for all opStack[] operations (except the current one)
    const availableManaInThePool = getAvailableMana(this.game.state, this.game.playerA().manaPool, this.card.gId);
    if (this.params.manaExtra) {
      for (let t = 0; t <= 5; t++) { availableManaInThePool[t] -= this.params.manaExtra[t]; }
    }

    const manaStatus = checkMana(this.manaCost, availableManaInThePool);

    if (manaStatus === 'exact' || manaStatus === 'auto') {
      this.turnOff();
      setTimeout(() => this.game.action(this.action, this.params));
    }
    else if (manaStatus === 'not enough') {
      console.log('Still not enough mana');
      this.manaNeeded = [...this.manaCost];
      for (let t = 1; t <= 5; t++) {
        this.manaNeeded[t] = Math.max(0, this.manaCost[t] - availableManaInThePool[t]);
        availableManaInThePool[t] -= Math.min(this.manaCost[t], availableManaInThePool[t]);
      }
      for (let t = 0; t <= 5; t++) {
        this.manaNeeded[0] = Math.max(0, this.manaNeeded[0] - availableManaInThePool[t]);
      }
    }
    else if (manaStatus === 'manual') { // Too many mana of different colors. You need to select
      console.log('Ops, too much mana of different colors. You need to select');        

      const reserveStatus = checkMana(this.manaCost, this.manaReserved);
      if (reserveStatus === 'exact' || reserveStatus === 'auto') {
        this.turnOff();
        setTimeout(() => this.game.action(this.action, this.params));
      } 
      else if (this.status !== 'selectingMana') {
        this.startNewOp(); // Start a new operation to select mana
      }
    }    
  }


  addTarget(target: string) {
    if (!this.params.targets) { this.params.targets = []; }
    this.params.targets?.push(target);
    this.tryToAction();
  }
  

  turnOff() {
    if (this.status !== 'off') {
      // this.mainInfo = this.text;
      // this.globalButtons.removeById('cancel-summon');
      this.manaCost     = [0,0,0,0,0,0];
      this.manaReserved = [0,0,0,0,0,0];
      this.manaLeft     = [0,0,0,0,0,0];
      this.manaNeeded   = [0,0,0,0,0,0];
      this.status = 'off';
    }
  }

  cancel() {
    this.turnOff();
    this.gId = ''; // Force values reset
    this.game.action('cancel-op');
  }

}