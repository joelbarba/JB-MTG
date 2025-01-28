import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { BfDnDModule, BfUiLibModule } from 'bf-ui-lib';
import { GameStateService } from '../gameLogic/game-state.service';
import { TActionCost, TGameCard } from '../../../../core/types';
import { GameCardComponent } from '../game-card/game-card.component';
import { ManaArrayComponent } from "../mana-array/mana-array.component";
import { Subscription } from 'rxjs';
import { CardOpServiceNew } from '../gameLogic/cardOp.service';
import { GameCardEventsService } from '../gameLogic/game-card-events.service';
import { WindowsService } from '../gameLogic/windows.service';
import { validateCost } from '../gameLogic/game.utils';


@Component({
  selector    : 'dialog-upkeep',
  templateUrl : './dialog-upkeep.component.html',
  styleUrl    : './dialog-upkeep.component.scss',
  standalone: true,
  imports: [
    CommonModule,
    BfDnDModule,
    TranslateModule,
    FormsModule,
    BfUiLibModule,
    GameCardComponent,
    ManaArrayComponent,
]
})
export class DialogUpkeepComponent {
  title = 'Upkeep';
  youControl = false;
  cost: TActionCost | null = null;
  card!: TGameCard;

  text = '';
  showPayBtn = false; // If initially the cost is ready, don't do it automatically, but show the button to allow the choice (pay/cancel)
  showSkipBtn = false; // If the cost of the upkeep is optional (canSkip) allow not paying it
  skipText = 'Cancel';


  stateSub!: Subscription;
  winSub!: Subscription;

  constructor(
    private game: GameStateService,
    public cardOp: CardOpServiceNew,
    public cardEv: GameCardEventsService,
    public win: WindowsService,
  ) {}

  ngOnInit() {
    this.stateSub = this.game.state$.subscribe(() => this.onUpdate());
    // this.winSub = this.win.change$.subscribe(winName => { console.log(`UPKEEP Dialog: Windows Change (${winName}) -> onUpdate()`); this.onUpdate(); });
    // console.log('UPKEEP Dialog: ngOnInit -> onUpdate()');
    this.onUpdate();
  }


  ngOnDestroy() {
    this.stateSub?.unsubscribe();
    this.winSub?.unsubscribe();
  }

  onUpdate() {
    this.youControl = this.game.state.control === this.game.playerANum;
    this.title = this.youControl ? 'Your Upkeep' : `Opponent's Upkeep`;

    const unresolvedUpkeeps = this.game.state.cards.filter(c => c.waitingUpkeep);
    if (unresolvedUpkeeps.length) { 
      this.card = unresolvedUpkeeps[0];
      this.cost = this.card.getUpkeepCost(this.game.state);

      if (this.youControl) {
        if (!this.cardOp.status) {
          const gId = this.card.gId;
          const params = { gId };
          const opStatus = validateCost(this.card, params, this.cost, this.game.playerA().manaPool);
          
          this.text = this.cost?.text || `${this.card.name} upkeep`;
          this.showPayBtn = opStatus === 'ready';
          this.showSkipBtn = !!this.cost?.canSkip;
          this.skipText = this.cost?.skipText || 'Cancel';
          
          console.log('Paying Upkeep for:', this.card.gId, this.card.name, 'cost=', this.cost, 'canSkip=', !!this.cost?.canSkip, 'opStatus=', opStatus);
  
          // Automatically start the pay upkeep operation (if it needs manual action)
          if (opStatus !== 'ready') { setTimeout(() => this.cardOp.startNew(gId, 'pay-upkeep', params)); }
        }

      } else { // Opponent's dialog
        this.text = this.cost?.opText || '';
        this.showPayBtn = false;
        this.showSkipBtn = false;
      }

    }
  }

  cancel() {
    this.cardOp.resetAll();
    this.game.action('skip-upkeep', { gId: this.card.gId });
  }
  
  payUpkeep() {
    const gId = this.card.gId;
    this.cardOp.startNew(gId, 'pay-upkeep', { gId });
  }
  
}
