import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { BfConfirmService, BfDnDModule, BfDnDService, BfUiLibModule } from 'bf-ui-lib';
import { GameStateService } from '../../gameLogic/game-state.service';
import { TActionParams, TGameCard, TGameState, TPlayer } from '../../../../../core/types';
import { Subscription } from 'rxjs';
import { TStackTree } from '../dialog-spell-stack.component';
import { GameCardComponent } from "../../game-card/game-card.component";
import { CardOpServiceNew } from '../../gameLogic/cardOp.service';

@Component({
  selector: 'stack-card-with-targets',
  standalone: true,
  imports: [
    CommonModule,
    BfDnDModule,
    TranslateModule,
    FormsModule,
    BfUiLibModule,
    GameCardComponent,
],
  templateUrl: './stack-card-with-targets.component.html',
  styleUrl: './stack-card-with-targets.component.scss'
})
export class StackCardWithTargetsComponent {
  @Input({ required: true }) item!: TStackTree; // Can be a card or a player
  @Output() selectCard    = new EventEmitter<TGameCard>();
  @Output() hoverCard     = new EventEmitter<any>();
  @Output() clearHover    = new EventEmitter<any>();

  targetPlayerText = '';
  playerLetter!: 'A' | 'B';

  constructor(
    public game: GameStateService,
    public cardOp: CardOpServiceNew,
  ) {}

  ngOnInit() {
  }

  ngOnChanges() {
    if (this.item.player) {
      this.playerLetter = this.item.player.num === this.game.playerANum ? 'A' : 'B';
      const ref = this.playerLetter === 'A' ? 'You' : 'Opponent';
      this.targetPlayerText = `${this.item.player.name} (${ref})`;
    }
  }

  ngOnDestroy() {    
  }



}
