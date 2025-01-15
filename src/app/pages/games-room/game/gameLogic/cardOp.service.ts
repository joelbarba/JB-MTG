import { Injectable } from '@angular/core';
import { EPhase, TAction, TActionCost, TActionParams, TCardOpStatus, TCast, TGameCard, TGameState } from '../../../../core/types';
import { GameStateService } from './game-state.service';
import { calcManaCost, validateCost } from './game.utils';


export type TCardOp = {
  gId: string,
  status: TCardOpStatus, // 'waitingMana' | 'selectingMana' | 'waitingExtraMana' | 'selectingTargets' 
  cost: null | TActionCost,
  action: 'summon-spell' | 'trigger-ability' | 'pay-upkeep',
  params: TActionParams,
}

@Injectable({ providedIn: 'root' })
export class CardOpServiceNew {
  stack: Array<TCardOp> = []; // Stack of operations

  // Previous state memory to calculate deltas
  prevManaPool?: TCast;               // Mana pool of the previous state
  prevPhase: EPhase = EPhase.untap;   // Previous state phase

  onUpdate = () => {};  // To react on changes externally


  // From here below, all variables are recalculated on afterChanges():

  // Current operation (stack.at(-1))
  gId = '';
  status: null | TCardOpStatus = null;
  cost: null | TActionCost = null; // This is not the mana, but full cost object
  action: 'summon-spell' | 'trigger-ability' | 'pay-upkeep' = 'summon-spell';
  params: TActionParams = {
    manaToUse        : [0,0,0,0,0,0], // Total mana to be used for the operation (except extra)
    manaForUncolor   : [0,0,0,0,0,0], // What mana of the manaToUse will be used for uncolored
    manaExtra        : [0,0,0,0,0,0], // Extra mana selection (apart from the cast) for X
    isExtraManaReady : false,
    targets          : [],
  };

  card?: TGameCard;
  summonIds: string[] = []; // All gId of the current summoning operations
  showManaOkBtn = false;    // When 'selectingMana', show the Submit button only if the selection is correct
  showCancelBtn = false;    // To show the cancel button for the operation
  minimizeSelectManaDialog = false;
  minimizeExtraManaDialog  = false;
  customDialog: null | string = null;  // If the operation requires a custom dialog to open when it's :selectingTargets

  manaPool      : TCast = [0,0,0,0,0,0]; // PlayerA's mana pool (shortcut to this.game.playerA().manaPool)
  manaAvailable : TCast = [0,0,0,0,0,0]; // manaPool - reserved (manaToUse + manaExtra) for other (waitingExtraMana / selectingTargets) operations
  manaToDisplay : TCast = [0,0,0,0,0,0]; // manaAvailable - reserved (manaToUse + manaExtra) for the current operation (this is different from available when selectingMana or waitingExtraMana)
  manaCost      : TCast = [0,0,0,0,0,0]; // Total mana cost of the op's action (= op.cost.mana)
  manaNeeded    : TCast = [0,0,0,0,0,0]; // manaCost - available in the pool (to show next to mainInfo)

  possibleTargets: string[] = [];  // cost.possibleTargets[] but with playerA/B --- turned to ---> player1/2

  
  
  constructor(private game: GameStateService) {}

  onStateUpdate(state: TGameState) {
    this.afterChanges(); // Extend the (state) mana pool changes on local variables

    if (state.phase !== this.prevPhase) { this.resetAll(); } // Cancel all operations when the phase ends

    if (this.status === 'waitingMana') { 
      this.tryToExecute(); // Try to execute the current operation (in case new mana was added)
    }
    else if (this.status === 'waitingExtraMana') {
      if (this.prevManaPool) { // If only 1 mana was added, use it for the X extra mana
        const diffMana = this.prevManaPool.map((prevMana, ind) => this.manaPool[ind] - prevMana);
        console.log('prevManaPool=', this.prevManaPool, ',  manaPool=', this.manaPool, ',  diffMana=', diffMana);
        if (diffMana.reduce((a, v) => a + v, 0) > 0) { // If new mana was added to your mana pool, spend it all
          this.reserveAllPoolForExtra()
          console.log('New mana added to your pool. Using it for extra mana. manaExtra=', this.params.manaExtra);
        }
      }      
    }

    this.prevPhase = state.phase;
    this.prevManaPool = [...this.manaPool];
  }


  // Resets all values (remove all operations)
  resetAll() {
    this.stack = [];
    this.afterChanges();
  }


  // There are 2 main data sources: state + stack
  // Every time any of these 2 change, all the rest of the varialbles are recalculated here:
  private afterChanges() {
    this.calculateManaPool();

    const op = this.stack.at(-1);
    if (!op) { // When empty stack
      this.gId = '';
      this.status = null;
      this.cost = null;
      this.action = 'summon-spell';
      this.params = {
        manaToUse        : [0,0,0,0,0,0], // Mana to be used for the operation
        manaForUncolor   : [0,0,0,0,0,0], // What mana of the manaPool will be used for uncolored
        manaExtra        : [0,0,0,0,0,0], // Extra mana selection (apart from the cast) for X
        isExtraManaReady : false,
        targets          : [],
      };
      this.card = undefined;
      this.summonIds = [];
      this.possibleTargets = [];
      this.showManaOkBtn = false;
      this.showCancelBtn = false;
      this.customDialog = null;
      this.minimizeSelectManaDialog = false;
      this.minimizeExtraManaDialog = false;
      this.manaNeeded = [0,0,0,0,0,0];
      this.manaCost   = [0,0,0,0,0,0];

    } else { // When an ongoing op
      this.gId    = op.gId;
      this.status = op.status;
      this.cost   = op.cost;
      this.action = op.action;
      this.params = op.params;
      this.card = this.game.state.cards.find(c => c.gId === op.gId);
  
      this.summonIds = this.stack.filter(op => op.action === 'summon-spell').map(op => op.gId);
      this.showManaOkBtn = false;
      this.showCancelBtn = true;
      this.minimizeExtraManaDialog = !!this.game.state.cards.find(c => c.location === 'stack'); // Minimize when summoning others
      this.minimizeSelectManaDialog = op.status !== 'selectingMana'; // Always open it if needed
  
      this.manaNeeded = op.cost?.mana || [0,0,0,0,0,0];
      this.manaCost   = op.cost?.mana || [0,0,0,0,0,0];
      
      this.customDialog = null; // Show custom dialog for the card's operation

      if (op.status === 'waitingMana') {
        
        // Calculate manaNeeded[] (cost - available)
        const manaInThePool: TCast = [...this.manaAvailable];
        if (op.cost) {
          this.manaNeeded = [...op.cost.mana];
          for (let t = 1; t <= 5; t++) {
            const mana = Math.min(op.cost.mana[t], manaInThePool[t]);
            manaInThePool[t] -= mana;
            this.manaNeeded[t] -= mana;
          }
          let uncoloredCost = op.cost.mana[0];
          for (let t = 0; t <= 5; t++) {
            const mana = Math.min(uncoloredCost, manaInThePool[t]);
            uncoloredCost -= mana;
            manaInThePool[t] -= mana;
            this.manaNeeded[0] -= mana;
          }
        }
      }


      if (op.status === 'selectingMana') {
        if (this.params.manaToUse) { // Check if the selection is right (enough selected mana)
          const { manaStatus } = calcManaCost(this.manaCost, this.params.manaToUse, this.params.manaForUncolor);
          this.showManaOkBtn = manaStatus === 'ok';
          if (this.showManaOkBtn && op.cost?.xMana) { setTimeout(() => this.tryToExecute()); } // Auto jump to waitingExtraMana
        }      
      }

      // Automatically calculate the mana to use for this operation, so it can be reserved
      if (op.status === 'waitingExtraMana' || op.status === 'selectingTargets') {
        const { totalManaToUse, manaForUncolor } = calcManaCost(this.manaCost, this.manaAvailable, op.params.manaForUncolor);
        op.params.manaForUncolor = manaForUncolor;
        op.params.manaToUse = totalManaToUse;
        this.calculateManaPool();
      }

      if (op.status === 'selectingTargets') { // Set dialog if needed
        if (op.cost?.customDialog) { this.customDialog = this.card?.name.replaceAll(' ', '') || null; }
        
        // Turn playerA/B to player1/2 in possibleTargets[]
        this.possibleTargets = (op.cost?.possibleTargets || []).map(target => {
          if (target === 'playerA') { return 'player' + this.game.playerANum; }
          if (target === 'playerB') { return 'player' + this.game.playerBNum; }
          return target;
        });
      }



    }
    this.onUpdate(); // Broadcast external changes
  }


  // When you want to play a card (summon or trigger ability), instead of directly calling game.action()
  // you must call this function to start a new operation that tracks all the parameter gathering
  startNew(gId: string, action: TAction, params: TActionParams) {
    if (action !== 'summon-spell' && action !== 'trigger-ability' && action !== 'pay-upkeep') {
      return this.game.action(action, params); // Other actions create no operation
    }

    const card = this.game.state.cards.find(c => c.gId === gId);
    if (!card) { return; } // Invalid gId

    // If this is the current ongoig operation, cancel it
    if (this.stack.at(-1)?.gId === gId) { return this.cancel(); }

    this.removeOpFromStack(gId); // Remove previous operations with the same card (if any)

    const cost = card.getCost(this.game.state, action);
    const op: TCardOp = { gId, status: 'waitingMana', action, params: { gId }, cost }; // Create a new operation

    console.log('Starting a New Card Operation', op);
    this.stack.push(op); // Stack the new operation
    this.tryToExecute();
  }


  // Try to execute the current operation (send an action to the state)
  // This function may remove (execute) or change the status of the current operation
  tryToExecute(): 'ready' | 'error' | TCardOpStatus {
    const op = this.stack.at(-1);
    if (!op) { return 'error'; }    
    
    const card = this.game.state.cards.find(c => c.gId === op.gId);
    if (!card) { return 'error'; }
    
    console.log('Trying to execute the current operation', op);

    this.calculateManaPool(); // Get the right this.manaAvailable[]
    const opStatus = validateCost(card, op.params, op.cost, this.manaAvailable);

    if (opStatus === 'error') { 
      this.removeOpFromStack(op.gId);
      console.error('Operation error', op); 
    }
    else if (opStatus === 'ready') {
      this.removeOpFromStack(op.gId);
      setTimeout(() => this.game.action(op.action, op.params)); // Run it immediately

    } else { // If not ready to be executed, stack new Op and wait for params to change

      // If you turn to "selectingMana", autoselect all the (possible) colored mana
      if (op.status !== opStatus && opStatus === 'selectingMana') {
        setTimeout(() => { // Do it afterChanges
          for (let t = 1; t <= 5; t++) {
            const colored = Math.min(this.manaAvailable[t], this.manaCost[t]);
            for (let q = 0; q < colored; q++) { this.selectMana(t); }
          }
        });
      }

      op.status = opStatus;
      console.log('The current operation cannot be executed yet', op);
    }    

    this.afterChanges();
    return opStatus;
  }


  // Select 1 mana from the pool to be used
  // This function changes the params: manaToUse[] + manaForUncolor[] + manaExtra[]
  selectMana(pool: number) {
    const op = this.stack.at(-1);

    if (op && op.status === 'selectingMana') { // Select one to be used as the fixed mana cost
      if (!this.params.manaToUse) { this.params.manaToUse = [0,0,0,0,0,0]; }
      if (!this.params.manaForUncolor) { this.params.manaForUncolor = [0,0,0,0,0,0]; }
  
      this.calculateManaPool();
      const isManaAvailable = this.manaAvailable[pool] > this.params.manaToUse[pool];
  
      if (isManaAvailable && op.cost?.mana) {
        const colorLeft = op.cost.mana[pool] - this.params.manaToUse[pool];
        if (colorLeft > 0) {
          this.params.manaToUse[pool] += 1;
        } else {
  
          const uncolorUsed = this.params.manaForUncolor.reduce((a,v) => a + v, 0);
          const uncolorLeft = op.cost.mana[0] - uncolorUsed;
          if (uncolorLeft > 0) {
            this.params.manaToUse[pool] += 1;
            this.params.manaForUncolor[pool] += 1;
          } else {
            // console.error('YOU CANT USE THIS MANA');
          }
        }
      }
    }

    if (op && op.status === 'waitingExtraMana') { // Select one to be used as the extra mana cost
      if (!op.params.manaToUse) { op.params.manaToUse = [0,0,0,0,0,0]; }
      if (!op.params.manaExtra) { op.params.manaExtra = [0,0,0,0,0,0]; }

      this.calculateManaPool();
      const xMana = op.cost?.xMana || [0,0,0,0,0,0];
      const manaLeft = this.manaAvailable[pool] - op.params.manaToUse[pool] - op.params.manaExtra[pool];
      if (manaLeft > 0 && xMana[pool] > 0) { op.params.manaExtra[pool] += 1; }
    }

    this.afterChanges();
  }


  // Select all mana from the pool to be used. This function changes the params: manaToUse[] + manaExtra[]
  reserveAllPoolForExtra() {
    const op = this.stack.at(-1);
    if (op && op.status === 'waitingExtraMana') {
      if (!op.params.manaToUse) { op.params.manaToUse = [0,0,0,0,0,0]; }
      if (!op.params.manaExtra) { op.params.manaExtra = [0,0,0,0,0,0]; }
      this.calculateManaPool();
      
      const xMana = op.cost?.xMana || [0,0,0,0,0,0];
      for (let pool = 0; pool <= 5; pool++) {
        const manaLeft = this.manaAvailable[pool] - op.params.manaToUse[pool] - op.params.manaExtra[pool];
        if (manaLeft > 0 && xMana[pool] > 0) { op.params.manaExtra[pool] += manaLeft; }
      }      
      this.afterChanges();
    }
  }


  // To complete the waitingExtraMana status
  completeExtraMana() {
    this.params.isExtraManaReady = true;
    this.tryToExecute();
  }


  // Adding 1 target to the selection
  selectTargets(targets: string[]) {
    if (!this.params.targets) { this.params.targets = []; }
    targets.forEach(target => this.params.targets?.push(target));    
    this.tryToExecute();
  }

  selectTargetPlayer(num: '1' | '2') {
    if (this.isTargetPlayer(num)) { this.selectTargets(['player' + num]); }
  }

  // TODO: Find and remove: playerA.selectableAction || playerA.selectableTarget
  isTargetPlayer(num: '1' | '2') {
    return this.status === 'selectingTargets' 
      && !!this.possibleTargets.find(t => t === 'player' + num);
  }


  // Cancels the current operation, and sets the previous (if any)
  cancel() { 
    const op = this.stack.at(-1);
    if (op) { this.removeOpFromStack(op.gId); }
    this.afterChanges();
  }


  // --------------------------------------------------------------------------------

  // This function sets: manaPool[] + manaAvailable[] + manaToDisplay[]
  private calculateManaPool() {
    this.manaPool = [...this.game.playerA().manaPool];
    this.manaAvailable = [...this.manaPool];
    const currOp = this.stack.at(-1);
    
    // For ongoig operations that are in "waitingExtraMana" or "selectingTargets",
    // reserve the mana that they are going to use (params.manaToUse[]) making it unavailable in the pool
    // This way these operations can safely continue with the needed mana after other operations (that may also spend mana) are done
    this.stack
      .filter(op => op.gId !== currOp?.gId) // Exclude the current operation
      .filter(op => op.status === 'waitingExtraMana' || op.status === 'selectingTargets')
      .forEach(op => {
      const manaToUse = op.params.manaToUse || [0,0,0,0,0,0];
      const manaExtra = op.params.manaExtra || [0,0,0,0,0,0];
      for (let t = 0; t <= 5; t++) {
        this.manaAvailable[t] -= manaToUse[t];
        this.manaAvailable[t] -= manaExtra[t];
      }
    });

    this.manaToDisplay = [...this.manaAvailable];

    // If the current operation is cherry picking or adding extra mana, hide those already selected too
    if (currOp?.status === 'selectingMana' || currOp?.status === 'waitingExtraMana') {
      const manaToUse = currOp.params.manaToUse || [0,0,0,0,0,0];
      const manaExtra = currOp.params.manaExtra || [0,0,0,0,0,0];
      for (let t = 0; t <= 5; t++) {
        this.manaToDisplay[t] -= manaToUse[t];
        this.manaToDisplay[t] -= manaExtra[t];
      }
    }

  }

  private removeOpFromStack(gId: string) {
    const op = this.stack.find(op => op.gId === gId);
    if (op) { this.stack.splice(this.stack.indexOf(op), 1); }
  }

}


