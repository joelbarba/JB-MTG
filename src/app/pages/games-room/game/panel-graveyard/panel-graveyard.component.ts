import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { BfConfirmService, BfDnDModule, BfDnDService, BfUiLibModule } from 'bf-ui-lib';
import { GameStateService } from '../gameLogic/game-state.service';
import { TActionParams, TGameCard, TGameState, TPlayer } from '../../../../core/types';
import { Subscription } from 'rxjs';
import { GameCardComponent } from "../game-card/game-card.component";

@Component({
  selector: 'panel-graveyard',
  standalone: true,
  imports: [
    CommonModule,
    BfDnDModule,
    TranslateModule,
    FormsModule,
    BfUiLibModule,
    GameCardComponent
],
  templateUrl: './panel-graveyard.component.html',
  styleUrl: './panel-graveyard.component.scss'
})
export class PanelGraveyardComponent {
  @Input({ required: true }) playerLetter!: 'A' | 'B';
  @Output() selectCard  = new EventEmitter<TGameCard>();
  @Output() end         = new EventEmitter<any>();
  minimized = false;
  stateSub!: Subscription;

  title = 'Graveyard';
  youControl = false;
  player!: TPlayer;

  grav!: Array<TGameCard>;

  constructor(public game: GameStateService) {}

  ngOnInit() {
    this.stateSub = this.game.state$.subscribe(state => this.onStateChanges(state));
    this.onStateChanges(this.game.state);
  }

  ngOnChanges() {
    this.player = this.playerLetter === 'A' ? this.game.playerA() : this.game.playerB();
    this.title = `${this.player.name}'s Graveyard`;
  }
  ngOnDestroy() {
    if (this.stateSub) { this.stateSub.unsubscribe(); }
  }

  onStateChanges(state: TGameState) {
    const playerB = this.game.playerANum === '1' ? state.player2 : state.player1;
    this.youControl = (this.game.state.control === this.game.playerANum);

    this.grav = state.cards.filter(c => c.location === 'grav' + this.player.num).sort((a, b) => a.order > b.order ? 1 : -1);
    console.log('Graveyard Cards', this.grav);
  }

}
