import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { BfDnDModule, BfUiLibModule } from 'bf-ui-lib';
import { GameCardComponent } from '../../game-card/game-card.component';
import { TGameCard } from '../../../../../core/types';
import { ManaIconComponent } from "../../mana-icon/mana-icon.component";
import { GameStateService } from '../../../game-state.service';
import { CardOpServiceNew } from '../../cardOp.service';


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
    public cardOp: CardOpServiceNew,
  ) {}

  cancel() {
    // this.game.action('cancel-op');
    this.cardOp.cancel();
  }  
  
  select() {
    const targets = [
      'custom-color-' + this.mana1,
      'custom-color-' + this.mana2,
      'custom-color-' + this.mana3,
    ];
    this.cardOp.selectTargets(targets)
  }
}
