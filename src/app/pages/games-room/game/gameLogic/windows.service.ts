import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';
import { TCardOpStatus, TGameCard, TGameState } from '../../../../core/types';
import { GameStateService } from './game-state.service';
import { CardOpServiceNew } from './cardOp.service';
import { getCards } from './game.utils';


type TDialogButton = { text: string, class: string, action: () => void };

@Injectable({ providedIn: 'root' })
export class WindowsService {
  change$ = new Subject<string>;
  defaultPayer: 'A' | 'B' = 'A';
  defaultCard: TGameCard | null = null;
  private readonly ZINDEX_OFFSET = 1000;

  graveyardPanel = {
    display: false, zInd: 0, size: 'max', bottom: 0, player: this.defaultPayer,
    maximize: () => this.maximize(0),
    open: (player: 'A' | 'B') => { this.graveyardPanel.player = player; this.open(0); },
    close: () => this.close(0),
    toggle: (player: 'A' | 'B') => {
      const shouldOpen = !this.graveyardPanel.display || this.graveyardPanel.player !== player;
      this.graveyardPanel.close();
      if (shouldOpen) { this.graveyardPanel.open(player); }
    },
  };

  damageDialog = {
    display: false, zInd: 0, size: 'max', bottom: 0, title: '', icon: 'icon-fire', buttons: [] as TDialogButton[], text: '',
    maximize: () => this.maximize(1), open: () => this.open(1),
    minimize: () => this.minimize(1), close: () => this.close(1),
  };
  
  combatDialog = {
    display: false, zInd: 0, size: 'max', bottom: 0, attacker: this.defaultPayer,
    open: (attacker: 'A' | 'B') => { this.combatDialog.attacker = attacker; this.open(2); },
    close: () => this.close(2),
    maximize: () => this.maximize(2),
    minimize: () => this.minimize(2),
  };

  selectManaDialog = {
    display: false, zInd: 0, size: 'max', bottom: 0,
    maximize: () => this.maximize(3), open: () => this.open(3),
    minimize: () => this.minimize(3), close: () => this.close(3),
  };

  spellStackDialog = {
    display: false, zInd: 0, size: 'max', bottom: 0,
    maximize: () => this.maximize(4), open: () => this.open(4),
    minimize: () => this.minimize(4), close: () => this.close(4),
  };

  regenerateDialog = {
    display: false, zInd: 0, size: 'max', bottom: 0,
    maximize: () => this.maximize(5), open: () => this.open(5),
    minimize: () => this.minimize(5), close: () => this.close(5),
  };

  extraManaDialog = {
    display: false, zInd: 0, size: 'max', bottom: 0,
    maximize: () => this.maximize(6), open: () => this.open(6),
    minimize: () => this.minimize(6), close: () => this.close(6),
  };

  effectsPanel = {
    display: false, zInd: 0, size: 'max', bottom: 0, card: this.defaultCard,
    maximize: () => this.maximize(7),
    minimize: () => this.minimize(7), close: () => this.close(7),
    open: (card: TGameCard) => { this.effectsPanel.card = card; this.open(7); }
  };

  customDialog = {
    display: false, zInd: 0, size: 'max', bottom: 0, name: '', card: this.defaultCard,
    maximize: () => this.maximize(8), 
    minimize: () => this.minimize(8), 
    close: () => {
      this.customDialog.name = '';
      this.customDialog.card = null;
      this.close(8);
    },
    open: () => {
      if (this.cardOp.customDialog) {
        this.customDialog.name = this.cardOp.customDialog;
        this.customDialog.card = this.cardOp.card as TGameCard;
        this.open(8);
      }
    }
  };

  upkeepDialog = {
    display: false, zInd: 0, size: 'max', bottom: 0, title: '',
    maximize: () => this.maximize(9), open: () => this.open(9),
    minimize: () => this.minimize(9), close: () => this.close(9),
  };


  allWindows = [
    this.graveyardPanel,    // 0
    this.damageDialog,      // 1
    this.combatDialog,      // 2
    this.selectManaDialog,  // 3
    this.spellStackDialog,  // 4
    this.regenerateDialog,  // 5
    this.extraManaDialog,   // 6
    this.effectsPanel,      // 7
    this.customDialog,      // 8
    this.upkeepDialog,      // 9
  ];
  windowNames = [
    'graveyardPanel',    // 0
    'damageDialog',      // 1
    'combatDialog',      // 2
    'selectManaDialog',  // 3
    'spellStackDialog',  // 4
    'regenerateDialog',  // 5
    'extraManaDialog',   // 6
    'effectsPanel',      // 7
    'customDialog',      // 8
    'upkeepDialog',      // 9
  ];
  


  // prevState!: TGameState;
  prevCardOpStatus: TCardOpStatus | null = null;


  constructor(
    private game: GameStateService,
    private cardOp: CardOpServiceNew,
  ) {}

  updateWindows() {
    const youControl = this.game.playerANum === this.game.state.control;


    // "Select Mana Dialog" (Open / Close logic)
    if (this.prevCardOpStatus !== this.cardOp.status) {
      if (this.cardOp.status    === 'selectingMana') { this.selectManaDialog.open(); }
      if (this.prevCardOpStatus === 'selectingMana') { this.selectManaDialog.close(); }
    }


    // "Select Extra Mana Dialog" (Open / Close logic)
    if (this.prevCardOpStatus !== this.cardOp.status) {
      if (this.cardOp.status    === 'waitingExtraMana') { this.extraManaDialog.open(); }
      if (this.prevCardOpStatus === 'waitingExtraMana') { this.extraManaDialog.close(); }
    }


    // "Upkeep Dialog" (Open / Close logic) 
    if (this.game.state.phase === 'upkeep' && this.game.state.cards.filter(c => c.waitingUpkeep).length) {
      // if (!this.upkeepDialog.display) { console.log('WINDOW: opening upkeep dialog'); }
      this.upkeepDialog.open();
    } else {
      // if (this.upkeepDialog.display) { console.log('WINDOW: closing upkeep dialog'); }
      this.upkeepDialog.close();
    }


    // "Combat Dialog" (Open / Close logic) ---> Done in game controller (updateCombatOperation)
    if (this.game.state.phase === 'combat') {
      const { tableA, tableB } = getCards(this.game.state, this.game.playerANum);      
      
      // If you have attacking creatures (you are leading an attack)
      const attackingCreatures = tableA.find(c => c.combatStatus === 'combat:attacking');

      if (!this.combatDialog.display) {
        if (attackingCreatures) { this.combatDialog.open('A'); }
    
        // If the opponent is attacking you
        const opponentAttack = tableB.find(c => c.combatStatus === 'combat:attacking');
        const defendingCreatures = tableA.find(c => c.combatStatus === 'combat:defending');
        if (opponentAttack || defendingCreatures) { this.combatDialog.open('B'); }

      } else {
        // If you unselected all attacking creatures
        if (this.game.state.subPhase === 'selectAttack' && !attackingCreatures) {this.combatDialog.close(); }
      }

      if (this.game.state.subPhase === 'regenerate') { this.combatDialog.close(); }

    } else { this.combatDialog.close(); }
    

    // "Spell Stack Dialog" (Open / Close logic)
    const anySpellsInTheStack = !!this.game.state.cards.find(c => c.location === 'stack');
    if (anySpellsInTheStack && (this.game.state.player1.stackCall || this.game.state.player2.stackCall)) {
      this.spellStackDialog.open();

      if (anySpellsInTheStack && !this.game.state.player1.stackCall && !this.game.state.player2.stackCall) { // This shouldn't happen
        console.warn('The stack was released, but there is still cards on it:', this.game.state.cards.find(c => c.location === 'stack'));
      }
      
      if (youControl && this.cardOp?.card?.controller === this.game.playerANum) {
        // If summoning a card and waiting for mana, minimize it (so the lands on the table get visible)
        if (this.cardOp.status === 'waitingMana')   { this.spellStackDialog.minimize(); this.combatDialog.minimize(); }
        if (this.cardOp.status === 'selectingMana') { this.spellStackDialog.minimize(); this.combatDialog.minimize(); }
        
        // If summoning a card and selecting a target, maximize it because its' most likely one on the stack
        if (this.cardOp.status === 'selectingTargets') { this.spellStackDialog.maximize(); }
      }
    } else { this.spellStackDialog.close(); }


    // "Regenerate Dialog" (Open / Close logic)
    // If a creature that can be regenerated is dying, open the regenerate dialog
    if (this.game.state.cards.find(c => c.turnCanRegenerate && c.isDying)) { this.regenerateDialog.open(); } 
    else { this.regenerateDialog.close(); }


    // "Custom Dialogs" (Open / Close logic)
    if (youControl && this.cardOp.customDialog) { this.customDialog.open(); }
    else { this.customDialog.close(); }


    // "Damage Dialog" if any life changes to be notified
    if (this.game.state.lifeChanges.length) {
      this.damageDialog.open();
      if (this.spellStackDialog.display) { this.spellStackDialog.open(); } // If stack is open, show it over
    }
    else { this.damageDialog.close(); }

    // this.prevState = JSON.parse(JSON.stringify(this.game.state));
    this.prevCardOpStatus = this.cardOp.status;
  }


  private open(winIndex: number) {
    const prevDisplay = this.allWindows[winIndex].display;
    const prevZIndex = this.allWindows[winIndex].zInd;
    this.allWindows[winIndex].display = true;
    this.allWindows[winIndex].zInd = this.ZINDEX_OFFSET;
    this.allWindows[winIndex].zInd = this.nextIndex();
    if (prevDisplay === false || prevZIndex !== this.allWindows[winIndex].zInd) { 
      this.allWindows[winIndex].size = 'max';
      this.change$.next(this.windowNames[winIndex]); 
    }
    // console.log('OPEN', winIndex);
  }
  private close(winIndex: number) {
    const prevDisplay = this.allWindows[winIndex].display;
    this.allWindows[winIndex].display = false;
    this.allWindows[winIndex].zInd = this.ZINDEX_OFFSET;
    if (prevDisplay === true) { this.change$.next(this.windowNames[winIndex]); }
  }


  private minimize(winIndex: number) {
    this.allWindows[winIndex].size = 'min';
    this.allWindows.filter(win => win.display && win.size === 'min').forEach((win, ind) => win.bottom = ind * 50);
    this.change$.next(this.windowNames[winIndex]);
    // console.log('MINIMIZE', winIndex);
  }
  private maximize(winIndex: number) {
    this.allWindows[winIndex].zInd = this.ZINDEX_OFFSET;
    this.allWindows[winIndex].zInd = this.nextIndex();
    this.allWindows[winIndex].size = 'max';
    this.allWindows.filter(win => win.display && win.size === 'min').forEach((win, ind) => win.bottom = ind * 50);
    this.change$.next(this.windowNames[winIndex]);
    // console.log('MAXIMIZE', winIndex);
  }

  private nextIndex() {
    return this.allWindows.reduce((a,w) => Math.max(a, w.zInd), this.ZINDEX_OFFSET) + 1;
  }


}

