import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { BfDnDModule, BfUiLibModule } from 'bf-ui-lib';
import { GameStateService } from '../../game-state.service';
import { TGameCard } from '../../../../core/types';
import { GameCardComponent } from '../game-card/game-card.component';
import { ISummonOp } from '../game.component';
import { ManaArrayComponent } from "../mana-array/mana-array.component";


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
  @Input({ required: true }) card!: TGameCard;
  @Input() mainInfo = '';
  @Input() summonOp?: ISummonOp;

  title = 'Regenerate';
  minimized = false;

  youControl = false;
  opponentName = '';

  constructor(
    private game: GameStateService,
  ) {}

  ngOnInit() {
    this.opponentName = this.game.playerB().name;
    this.youControl = this.card?.owner === this.game.playerANum;

    // Immediately trigger the 'regenerate-creature' action
    setTimeout(() => {
      if (this.youControl && this.card && this.card.selectableAction) {
        this.game.action(this.card.selectableAction.action, this.card.selectableAction.params);
      }    
    });
  }

  letItDie() {
    this.game.action('cancel-regenerate', { gId: this.card.gId });
  }  

  selectCard() {
    if (this.card.selectableAction) {
      this.game.action(this.card.selectableAction.action, this.card.selectableAction.params);
    }
  }
  
  select() {
    // this.game.action('trigger-ability', params);
  }
}
