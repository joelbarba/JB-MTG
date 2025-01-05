import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';
import { TCardOpStatus, TGameCard, TGameState } from '../../../../core/types';
import { GameStateService } from './game-state.service';
import { CardOpServiceNew } from './cardOp.service';


type TDialogButton = { text: string, class: string, action: () => void };

@Injectable({ providedIn: 'root' })
export class WindowsService {
  change$ = new Subject<void>;
  defaultPayer: 'A' | 'B' = 'A';
  defaultCard: TGameCard | null = null;
  private readonly ZINDEX_OFFSET = 1000;

  graveyardPanel = {
    display: false, zInd: 0, size: 'max', player: this.defaultPayer,
    open: (player: 'A' | 'B') => { this.graveyardPanel.player = player; this.open(0); },
    close: () => this.close(0),
    toggle: (player: 'A' | 'B') => {
      (this.graveyardPanel.display && this.graveyardPanel.player === player)
      ? this.graveyardPanel.close()
      : this.graveyardPanel.open(player);
    },
  };

  damageDialog = {
    display: false, zInd: 0, size: 'max', title: '', icon: 'icon-fire', buttons: [] as TDialogButton[], text: '',
    maximize: () => this.maximize(1), open: () => this.open(1),
    minimize: () => this.minimize(1), close: () => this.close(1),
  };
  
  combatDialog = {
    display: false, zInd: 0, size: 'max', attacker: this.defaultPayer,
    open: (attacker: 'A' | 'B') => { this.combatDialog.attacker = attacker; this.open(2); },
    close: () => this.close(2),
    maximize: () => this.maximize(2),
    minimize: () => this.minimize(2),
  };

  selectManaDialog = {
    display: false, zInd: 0, size: 'max',
    maximize: () => this.maximize(3), open: () => this.open(3),
    minimize: () => this.minimize(3), close: () => this.close(3),
  };

  spellStackDialog = {
    display: false, zInd: 0, size: 'max',
    maximize: () => this.maximize(4), open: () => this.open(4),
    minimize: () => this.minimize(4), close: () => this.close(4),
  };

  regenerateDialog = {
    display: false, zInd: 0, size: 'max',
    maximize: () => this.maximize(5), open: () => this.open(5),
    minimize: () => this.minimize(5), close: () => this.close(5),
  };

  extraManaDialog = {
    display: false, zInd: 0, size: 'max',
    maximize: () => this.maximize(6), open: () => this.open(6),
    minimize: () => this.minimize(6), close: () => this.close(6),
  };

  effectsPanel = {
    display: false, zInd: 0, size: 'max', card: this.defaultCard,
    maximize: () => this.maximize(7),
    minimize: () => this.minimize(7), close: () => this.close(7),
    open: (card: TGameCard) => { this.effectsPanel.card = card; this.open(7); }
  };

  customDialog = {
    display: false, zInd: 0, size: 'max', name: '', card: this.defaultCard,
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

  // Check cards that need custom dialogs to be opened
  // customDialogs: { [key:string]: TCustomDialog } = {};
  

  // <!-- Graveyard Panel -->
  // <!-- Generic Dialog -->
  // <dialog-combat 
  // <!-- Dialog: Selecting Mana (cherry pick on summoning) -->
  // <dialog-spell-stack
  // <dialog-regenerate *ngIf="regenerateCreature"></dialog-regenerate>
  // <!-- Dialog: Selecting Extra Mana (for cards with X cost) -->
  // <!-- Effects Floating Panel -->
  // <!-- Custom Card Dialogs -->

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
  ]
  


  // prevState!: TGameState;
  prevCardOpStatus: TCardOpStatus | null = null;


  constructor(
    private game: GameStateService,
    private cardOp: CardOpServiceNew,
  ) {}

  updateWindows() {
    const youControl = this.game.playerANum === this.game.state.control;

    // Open / Close "Damage Dialog: Mana Burn"
    this.damageDialog.close();
    if (this.game.state.phase === 'end' && this.game.state.options.find(op => op.action === 'burn-mana')) {
      const totalMana = this.game.playerA().manaPool.reduce((a, v) => a + v, 0);
      this.damageDialog.title = 'Mana Burn';
      this.damageDialog.icon = 'icon-fire';
      this.damageDialog.text = `There is ${totalMana} unspent mana into your mana pool.<br/> It deals ${totalMana} damage to you`;
      this.damageDialog.buttons = [{ text: 'Ok, burn it', class: 'quaternary', action: () => this.game.action('burn-mana') }];
      this.damageDialog.open();
    }

    // Open / Close "Select Mana Dialog"
    if (this.prevCardOpStatus !== this.cardOp.status) {
      if (this.cardOp.status    === 'selectingMana') { this.selectManaDialog.open(); }
      if (this.prevCardOpStatus === 'selectingMana') { this.selectManaDialog.close(); }
    }

    // Open / Close "Select Extra Mana Dialog"
    if (this.prevCardOpStatus !== this.cardOp.status) {
      if (this.cardOp.status    === 'waitingExtraMana') { this.extraManaDialog.open(); }
      if (this.prevCardOpStatus === 'waitingExtraMana') { this.extraManaDialog.close(); }
    }
    
    // Open / Close "Spell Stack Dialog"
    const anySpellsInTheStack = !!this.game.state.cards.find(c => c.location === 'stack');
    if (anySpellsInTheStack && (this.game.state.player1.stackCall || this.game.state.player2.stackCall)) {
      this.spellStackDialog.open();
      
      if (youControl && this.cardOp?.card?.controller === this.game.playerANum) {
        // If summoning a card and waiting for mana, minimize it (so the lands on the table get visible)
        if (this.cardOp.status === 'waitingMana')   { this.spellStackDialog.minimize(); }
        if (this.cardOp.status === 'selectingMana') { this.spellStackDialog.minimize(); }
        
        // If summoning a card and selecting a target, maximize it because its' most likely one on the stack
        if (this.cardOp.status === 'selectingTargets') { this.spellStackDialog.maximize(); }
      }
    }
    
    // Open / Close "Regenerate Dialog"
    // If a creature that can be regenerated is dying, open the regenerate dialog
    if (this.game.state.cards.find(c => c.canRegenerate && c.isDying)) { this.regenerateDialog.open(); } 
    else { this.regenerateDialog.close(); }

    // Open / Close "Custom Dialogs"
    if (youControl && this.cardOp.customDialog) { this.customDialog.open(); }
    else { this.customDialog.close(); }


    // this.prevState = JSON.parse(JSON.stringify(this.game.state));
    this.prevCardOpStatus = this.cardOp.status;
  }


  private open(winIndex: number) {
    const prevDisplay = this.allWindows[winIndex].display;
    const prevZIndex = this.allWindows[winIndex].zInd;
    this.allWindows[winIndex].display = true;
    this.allWindows[winIndex].zInd = this.ZINDEX_OFFSET;
    this.allWindows[winIndex].zInd = this.nextIndex();
    if (prevDisplay === false || prevZIndex !== this.allWindows[winIndex].zInd) { this.change$.next(); }
  }
  private close(winIndex: number) {
    const prevDisplay = this.allWindows[winIndex].display;
    this.allWindows[winIndex].display = false;
    this.allWindows[winIndex].zInd = this.ZINDEX_OFFSET;
    if (prevDisplay === true) { this.change$.next(); }
  }

  private minimize(winIndex: number) {
    this.allWindows[winIndex].size = 'min';
    this.change$.next();
  }
  private maximize(winIndex: number) {
    this.allWindows[winIndex].size = 'max';
    this.change$.next();
  }

  private nextIndex() {
    return this.allWindows.reduce((a,w) => Math.max(a, w.zInd), this.ZINDEX_OFFSET) + 1;
  }


}



/*
  <!-- Graveyard Panel -->
  <panel-graveyard *ngIf="graveyardPanel"
    [playerLetter]="graveyardPanel"
    (selectCard)="selectCard($event)"
    (end)="graveyardPanel = null">
  </panel-graveyard>


  <!-- Generic Dialog -->
  <div *ngIf="dialog" class="dialog-box" [class]="dialog.type" 
      [style.background]="dialog.background" [style.color]="dialog.color">
    <h2 *ngIf="dialog.title">{{dialog.title}}</h2>
    <h3 *ngIf="dialog.icon"><span [class]="dialog.icon"></span></h3>
    <p *ngIf="dialog.text" [innerHtml]="dialog.text"></p>
    <div class="dialog-btn-box">
      <div *ngFor="let button of dialog.buttons">
        <bf-btn [bfText]="button.text" [class]="button.class" bfIcon="icon-arrow-right3" (click)="button.action()"></bf-btn>
      </div>
    </div>
  </div>


  <dialog-combat 
    *ngIf="combatPanel"
    [attacker]="combatPanelAttacker"    
    (selectCard)="selectCard($event)"
    (end)="combatPanel = false">
  </dialog-combat>


  <!-- Dialog: Selecting Mana (cherry pick on summoning) -->
  <dialog-selecting-mana *ngIf="cardOp.status === 'selectingMana'"></dialog-selecting-mana>


  <dialog-spell-stack 
    *ngIf="spellStackPanel"
    [panelSize]="spellStackPanelSize"
    (selectCard)="selectCard($event)"
    (end)="spellStackPanel = false" >
  </dialog-spell-stack>
  <!-- spellStackPanelSize={{spellStackPanelSize}} -->
  <!-- panel={{panel}} -->

  <dialog-regenerate *ngIf="regenerateCreature"></dialog-regenerate>

  <!-- Dialog: Selecting Extra Mana (for cards with X cost) -->
  <dialog-selecting-extra-mana *ngIf="cardOp.status === 'waitingExtraMana'"></dialog-selecting-extra-mana>

  <!-- Effects Floating Panel -->
  <panel-effects *ngIf="effectsPanelCard"
    [card]="effectsPanelCard"
    (selectCard)="selectCard($event)"
    (end)="effectsPanelCard = null">
  </panel-effects>

  <!-- Custom Card Dialogs -->
  <black-lotus-dialog *ngIf="customDialogs['BlackLotus']" [card]="customDialogs['BlackLotus']"></black-lotus-dialog>
  <dual-land-dialog   *ngIf="customDialogs['Bayou']"           [card]="customDialogs['Bayou']"></dual-land-dialog>
  <dual-land-dialog   *ngIf="customDialogs['Badlands']"        [card]="customDialogs['Badlands']"></dual-land-dialog>
  <dual-land-dialog   *ngIf="customDialogs['Plateau']"         [card]="customDialogs['Plateau']"></dual-land-dialog>
  <dual-land-dialog   *ngIf="customDialogs['Savannah']"        [card]="customDialogs['Savannah']"></dual-land-dialog>
  <dual-land-dialog   *ngIf="customDialogs['Scrubland']"       [card]="customDialogs['Scrubland']"></dual-land-dialog>
  <dual-land-dialog   *ngIf="customDialogs['Taiga']"           [card]="customDialogs['Taiga']"></dual-land-dialog>
  <dual-land-dialog   *ngIf="customDialogs['TropicalIsland']"  [card]="customDialogs['TropicalIsland']"></dual-land-dialog>
  <dual-land-dialog   *ngIf="customDialogs['Tundra']"          [card]="customDialogs['Tundra']"></dual-land-dialog>
  <dual-land-dialog   *ngIf="customDialogs['UndergroundSea']"  [card]="customDialogs['UndergroundSea']"></dual-land-dialog>
  <dual-land-dialog   *ngIf="customDialogs['VolcanicIsland']"  [card]="customDialogs['VolcanicIsland']"></dual-land-dialog>
*/