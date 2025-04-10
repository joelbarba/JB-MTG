import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { BfConfirmService, BfDnDModule, BfDnDService, BfUiLibModule } from 'bf-ui-lib';
import { GameStateService } from '../gameLogic/game-state.service';
import { TActionParams, TGameCard, TGameState, TPlayer } from '../../../../core/types';
import { Subscription } from 'rxjs';
import { GameCardComponent } from "../game-card/game-card.component";
import { WindowsService } from '../gameLogic/windows.service';
import { GameCardEventsService } from '../gameLogic/game-card-events.service';

@Component({
  selector    :   'panel-graveyard',
  templateUrl : './panel-graveyard.component.html',
  styleUrl    : './panel-graveyard.component.scss',
  standalone: true,
  imports: [
    CommonModule,
    BfDnDModule,
    TranslateModule,
    FormsModule,
    BfUiLibModule,
    GameCardComponent
],
})
export class PanelGraveyardComponent {
  @Input() fix = false;  
  stateSub!: Subscription;
  winSub!: Subscription;
  title = 'Graveyard';
  youControl = false;
  player!: TPlayer;

  grav!: Array<TGameCard>;

  constructor(
    public game: GameStateService,
    public win: WindowsService,
    public cardEv: GameCardEventsService,
  ) {}

  ngOnInit() {
    this.winSub = this.win.change$.subscribe(() => this.updateParams());
    this.stateSub = this.game.state$.subscribe(state => this.onStateChanges(state));
    this.updateParams();
  }

  ngOnDestroy() {
    this.stateSub?.unsubscribe();
    this.winSub?.unsubscribe();
  }

  updateParams() {
    this.player = this.win.graveyardPanel.player === 'A' ? this.game.playerA() : this.game.playerB();
    this.title = `${this.player.name}'s Graveyard`;
    this.onStateChanges(this.game.state);
  }

  onStateChanges(state: TGameState) {
    const playerB = this.game.playerANum === '1' ? state.player2 : state.player1;
    this.youControl = (this.game.state.control === this.game.playerANum);

    this.grav = state.cards.filter(c => c.location === 'grav' + this.player.num).sort((a, b) => a.order > b.order ? 1 : -1);
    console.log('Graveyard Cards', this.grav);
  }

}
