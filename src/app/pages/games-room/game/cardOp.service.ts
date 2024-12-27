import { Injectable } from '@angular/core';
import { TAction, TActionParams, TCardOpStatus, TCast, TGameCard } from '../../../core/types';
import { GameStateService } from '../game-state.service';
import { checkMana } from './gameLogic/game.utils';


@Injectable({ providedIn: 'root' })
export class CardOpService {

  gId = '';
  opAction: 'summon' | 'ability' = 'summon';
  status: 'off' | TCardOpStatus = 'off';
  manaForUncolor: TCast = [0,0,0,0,0,0];
  manaExtra: TCast = [0,0,0,0,0,0];
  targets: Array<string> = [];

  action: TAction = 'summon-spell';
  params: TActionParams = {};

  title = '';
  text = '';
  card?: TGameCard;
  showSummonBtn = false;
  minimized = false;

  cast        : TCast = [0,0,0,0,0,0];    // Total mana cost of the op's action
  manaReserved: TCast = [0,0,0,0,0,0];    // Mana currently reserved to trigger the op's action
  manaLeft    : TCast = [0,0,0,0,0,0];    // Remaining Mana still needed (total - reserved)



  constructor(private game: GameStateService) {}

  update() { // To run every state change
    const state = this.game.state;
    
    if (!state.opStack.length) {  // If all operations have finished, turn it off
      if (this.status !== 'off') { this.turnOff(); }

    } else { // If there are ongoing operations      
      const currOp = state.opStack.at(-1); // If a new operation is detected, start it
      if (this.status === 'off' || this.gId !== currOp?.gId) { this.startNewOp(); }

      // If an ongoing waiting mana operation, try to use the current mana pool
      if (this.status === 'waitingMana') { this.tryToAction(); }
    }
  }

  startNewOp() {
    const state = this.game.state;
    const currOp = state.opStack.at(-1);

    if (currOp) {
      this.gId            = currOp.gId;
      this.opAction       = currOp.opAction;
      this.status         = currOp.status;
      this.manaForUncolor = currOp.manaForUncolor;
      this.manaExtra      = currOp.manaExtra;
      this.targets        = currOp.targets;

      this.card = state.cards.find(c => c.gId === this.gId);
      if (!this.card) { return console.error('Card not found', this.gId); }
      this.title         = `Summoning ${this.card.name}`;
      this.minimized     = false;
      this.showSummonBtn = false;
      this.cast          = [...this.card.getSummonCost(state)?.mana || [0,0,0,0,0,0]]; // Total cost
      this.manaLeft      = [...this.card.cast];   // Remaining mana left to summon
      this.manaReserved  = [0,0,0,0,0,0];         // Mana temporarily reserved to summon
      this.params        = { gId: this.gId };
      this.action        = 'summon-spell';
      if (this.card.isType('creature')) { this.action = 'summon-creature'; }
      

      if (currOp.status === 'waitingMana') {
        this.text = `You need to generate mana to summon ${this.card.name}:`;
      }
      else if (currOp.status === 'selectingMana') {
        this.text = `Please select the mana from your mana pool you want to use to summon ${this.card.name}`;
        this.autoReserveColoredMana();
      }
      else if (currOp.status === 'selectingTargets') {
        this.text = `Select target`;
      }
    }
  }


  autoReserveColoredMana() { // Automatically reserve colored mana
    const playerA = this.game.playerA();
    if (this.card) {
      for (let t = 0; t < Math.min(playerA.manaPool[1], this.card.cast[1]); t++) { this.reserveMana(1); }
      for (let t = 0; t < Math.min(playerA.manaPool[2], this.card.cast[2]); t++) { this.reserveMana(2); }
      for (let t = 0; t < Math.min(playerA.manaPool[3], this.card.cast[3]); t++) { this.reserveMana(3); }
      for (let t = 0; t < Math.min(playerA.manaPool[4], this.card.cast[4]); t++) { this.reserveMana(4); }
      for (let t = 0; t < Math.min(playerA.manaPool[5], this.card.cast[5]); t++) { this.reserveMana(5); }
    }
  }


  // Select one mana (manaReserved) from the mana pool to use the operation action
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
    this.showSummonBtn = this.manaLeft.reduce((v,a) => v + a, 0) <= 0;
  }
  

  tryToAction() {
    console.log('tryToAction');
    if (!this.card) { return; }

    const manaStatus = checkMana(this.cast, this.game.playerA().manaPool);

    if (manaStatus === 'exact' || manaStatus === 'auto') {
      this.turnOff();
      setTimeout(() => this.game.action(this.action, this.params));
    }
    else if (manaStatus === 'not enough') { console.log('Still not enough mana'); }
    else if (manaStatus === 'manual') { // Too many mana of different colors. You need to select
      console.log('Ops, too much mana of different colors. You need to select');        

      const reserveStatus = checkMana(this.cast, this.manaReserved);
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
      this.status = 'off';
    }
  }

  cancel() {
    this.turnOff();
    this.gId = ''; // Force values reset
    this.game.action('cancel-op');
  }

}