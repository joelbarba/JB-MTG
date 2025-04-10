import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { BfDnDModule, BfUiLibModule } from 'bf-ui-lib';
import { GameStateService } from '../gameLogic/game-state.service';
import { TGameCard, TGameState } from '../../../../core/types';
import { GameCardComponent } from '../game-card/game-card.component';
import { ManaArrayComponent } from "../mana-array/mana-array.component";
import { Subscription } from 'rxjs';
import { CardOpServiceNew } from '../gameLogic/cardOp.service';
import { GameCardEventsService } from '../gameLogic/game-card-events.service';
import { WindowsService } from '../gameLogic/windows.service';


@Component({
  selector    : 'dialog-regenerate',
  templateUrl : './dialog-regenerate.component.html',
  styleUrl    : './dialog-regenerate.component.scss',
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
export class DialogRegenerateComponent {
  @Input() fix = false;
  creatures!: TGameCard[];
  card?: TGameCard;

  title = 'Regenerate';
  minimized = false;

  youControl = false;
  opponentName = '';

  stateSub!: Subscription;

  disableBtn = false;

  constructor(
    private game: GameStateService,
    public cardOp: CardOpServiceNew,
    public cardEv: GameCardEventsService,
    public win: WindowsService,
  ) {}

  ngOnInit() {
    this.opponentName = this.game.playerB().name;
    this.stateSub = this.game.state$.subscribe(state => this.onStateChange(state));
    this.onStateChange(this.game.state);
  }

  onStateChange(state: TGameState) {
    this.youControl = state.control === this.game.playerANum;
    this.creatures = state.cards.filter(c => c.controller === state.control && c.turnCanRegenerate && c.isDying);
    this.card = this.creatures.length === 1 ? this.creatures[0] : undefined;
    
    // if (this.card) { // Immediately trigger the 'regenerate-creature' action
    //   setTimeout(() => {
    //     if (this.youControl && this.card && this.card.selectableAction) {
    //       // this.card.selectableAction.action = 'regenerate-creature';
    //       this.game.action('regenerate-creature', this.card.selectableAction.params);
    //     }    
    //   });
    // }

    this.disableBtn = !this.game.state.options.find(o => o.action === 'cancel-regenerate');
  }

  ngOnDestroy() {
    this.stateSub?.unsubscribe();
  }

  letThemDie() {
    this.game.action('cancel-regenerate', {});    
  }  

  selectCard(card: TGameCard) {
    if (card.selectableAction) {
      // card.selectableAction.action = 'regenerate-creature';
      // this.game.action('regenerate-creature', card.selectableAction.params);
      this.cardOp.startNew(card.gId, 'trigger-ability', { gId: card.gId });
    }
  }
  
}
