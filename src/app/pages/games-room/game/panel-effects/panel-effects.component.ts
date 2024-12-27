import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { BfConfirmService, BfDnDModule, BfDnDService, BfUiLibModule } from 'bf-ui-lib';
import { GameStateService } from '../../game-state.service';
import { TActionParams, TEffect, TGameCard, TGameState, TPlayer } from '../../../../core/types';
import { Subscription } from 'rxjs';
import { GameCardComponent } from "../game-card/game-card.component";

@Component({
  selector: 'panel-effects',
  standalone: true,
  imports: [
    CommonModule,
    BfDnDModule,
    TranslateModule,
    FormsModule,
    BfUiLibModule,
    GameCardComponent,
],
  templateUrl: './panel-effects.component.html',
  styleUrl: './panel-effects.component.scss'
})
export class PanelEffectsComponent {
  @Input({ required: true }) card!: TGameCard;
  @Output() selectCard  = new EventEmitter<TGameCard>();
  @Output() hoverCard   = new EventEmitter<any>();
  @Output() clearHover  = new EventEmitter<any>();
  @Output() end         = new EventEmitter<any>();
  minimized = false;
  stateSub!: Subscription;

  title = 'Effects';
  
  effectCards!: Array<TEffect & { card?: TGameCard }>;

  hCardsLen = 1;  // Max number of cards on a horizontal line

  constructor(public game: GameStateService) {}

  ngOnInit() {
    // this.stateSub = this.game.state$.subscribe(state => this.onStateChanges(state));
    // this.onStateChanges(this.game.state);
    this.effectCards = this.game.state.effects
      .filter(effect => effect.targets.includes(this.card.gId))
      .map(effect => {
        return { ...effect, card: this.game.state.cards.find(c => c.gId === effect.gId) };
      })
      .sort((a, b) => a.id > b.id ? 1 : -1);

    this.hCardsLen = this.effectCards.length;
    console.log('Effect Cards for ', this.effectCards);
  }

  ngOnChanges() {
    this.title = `${this.card.name}'s Effects`;
  }
  ngOnDestroy() {
    // if (this.stateSub) { this.stateSub.unsubscribe(); }
  }

  // onStateChanges(state: TGameState) {
  //   const playerB = this.game.playerANum === '1' ? state.player2 : state.player1;
  // }

}
