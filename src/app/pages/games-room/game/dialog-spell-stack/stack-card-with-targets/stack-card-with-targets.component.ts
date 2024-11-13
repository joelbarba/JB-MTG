import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { BfConfirmService, BfDnDModule, BfDnDService, BfUiLibModule } from '@blueface_npm/bf-ui-lib';
import { ISummonOp, ITargetOp } from '../../game.component';
import { GameStateService } from '../../../game-state.service';
import { TActionParams, TGameCard, TGameState, TPlayer } from '../../../../../core/types';
import { Subscription } from 'rxjs';
import { TStackTree } from '../dialog-spell-stack.component';

@Component({
  selector: 'stack-card-with-targets',
  standalone: true,
  imports: [
    CommonModule,
    BfDnDModule,
    TranslateModule,
    FormsModule,
    BfUiLibModule,    
  ],
  templateUrl: './stack-card-with-targets.component.html',
  styleUrl: './stack-card-with-targets.component.scss'
})
export class StackCardWithTargetsComponent {
  @Input({ required: true }) item!: TStackTree; // Can be a card or a player
  @Output() selectCard    = new EventEmitter<TGameCard>();
  @Output() selectPlayer  = new EventEmitter<TPlayer>();
  @Output() hoverCard     = new EventEmitter<any>();
  @Output() clearHover    = new EventEmitter<any>();

  targetPlayerText = '';

  constructor(public game: GameStateService) {}

  ngOnInit() {
  }

  ngOnChanges() {
    if (this.item.player) {
      const ref = this.item.player.num === this.game.playerANum ? 'You' : 'Opponent';
      this.targetPlayerText = `${this.item.player.name} (${ref})`;
    }
  }

  ngOnDestroy() {    
  }


}
