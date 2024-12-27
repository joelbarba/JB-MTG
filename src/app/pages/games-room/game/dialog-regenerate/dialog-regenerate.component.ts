import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { BfDnDModule, BfUiLibModule } from 'bf-ui-lib';
import { GameStateService } from '../../game-state.service';
import { TGameCard, TGameState } from '../../../../core/types';
import { GameCardComponent } from '../game-card/game-card.component';
import { ManaArrayComponent } from "../mana-array/mana-array.component";
import { Subscription } from 'rxjs';
import { CardOpService } from '../cardOp.service';


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
  creatures!: TGameCard[];
  card?: TGameCard;

  title = 'Regenerate';
  minimized = false;

  youControl = false;
  opponentName = '';

  stateSub!: Subscription;

  constructor(
    private game: GameStateService,
    public cardOp: CardOpService,
  ) {}

  ngOnInit() {
    this.opponentName = this.game.playerB().name;



    this.stateSub = this.game.state$.subscribe(state => this.onStateChange(state));
    this.onStateChange(this.game.state);
  }

  onStateChange(state: TGameState) {
    this.youControl = state.control === this.game.playerANum;
    this.creatures = state.cards.filter(c => c.controller === state.control && c.canRegenerate && c.isDying);
    this.card = this.creatures.length === 1 ? this.creatures[0] : undefined;
    
    if (this.card) { // Immediately trigger the 'regenerate-creature' action
      setTimeout(() => {
        if (this.youControl && this.card && this.card.selectableAction) {
          this.game.action(this.card.selectableAction.action, this.card.selectableAction.params);
        }    
      });
    }
  }

  ngOnDestroy() {
    this.stateSub?.unsubscribe();
  }

  letThemDie() {
    this.game.action('cancel-regenerate', {});    
  }  

  selectCard(card: TGameCard) {
    if (card.selectableAction) {
      this.game.action(card.selectableAction.action, card.selectableAction.params);
    }
  }
  
  select() {
    // this.game.action('trigger-ability', params);
  }
}
