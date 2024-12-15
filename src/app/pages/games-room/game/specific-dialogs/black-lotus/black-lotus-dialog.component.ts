import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { BfDnDModule, BfUiLibModule } from 'bf-ui-lib';
import { GameCardComponent } from '../../game-card/game-card.component';
import { TGameCard } from '../../../../../core/types';
import { ManaIconComponent } from "../../mana-icon/mana-icon.component";
import { GameStateService } from '../../../game-state.service';


@Component({
  selector: 'black-lotus-dialog',
  standalone: true,
  imports: [
    CommonModule,
    BfDnDModule,
    TranslateModule,
    FormsModule,
    BfUiLibModule,
    GameCardComponent,
    ManaIconComponent,
  ],
  templateUrl: './black-lotus-dialog.component.html',
  styleUrl: './black-lotus-dialog.component.scss'
})
export class BlackLotusDialogComponent {
  @Input({ required: true }) card!: TGameCard;

  mana1?: 0 | 1 | 2 | 3 | 4 | 5;
  mana2?: 0 | 1 | 2 | 3 | 4 | 5;
  mana3?: 0 | 1 | 2 | 3 | 4 | 5;

  constructor(
    private game: GameStateService,
  ) {}

  cancel() {
    this.game.action('cancel-ability');
  }  
  
  select() {
    const params = {
      gId: this.card.gId,
      targets: [
        'custom-color-' + this.mana1,
        'custom-color-' + this.mana2,
        'custom-color-' + this.mana3,
      ]
    };
    this.game.action('trigger-ability', params);
  }
}
