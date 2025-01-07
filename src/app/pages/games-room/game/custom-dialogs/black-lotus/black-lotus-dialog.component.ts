import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { BfDnDModule, BfUiLibModule } from 'bf-ui-lib';
import { GameCardComponent } from '../../game-card/game-card.component';
import { TGameCard } from '../../../../../core/types';
import { ManaIconComponent } from "../../mana-icon/mana-icon.component";
import { GameStateService } from '../../gameLogic/game-state.service';
import { CardOpServiceNew } from '../../gameLogic/cardOp.service';
import { Subscription } from 'rxjs';
import { WindowsService } from '../../gameLogic/windows.service';


@Component({
  selector    :   'black-lotus-dialog',
  templateUrl : './black-lotus-dialog.component.html',
  styleUrl    : './black-lotus-dialog.component.scss',
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
})
export class BlackLotusDialogComponent {
  card: TGameCard | null = null;
  winSub!: Subscription;
  title = 'Black Lotus';

  mana1?: 0 | 1 | 2 | 3 | 4 | 5;
  mana2?: 0 | 1 | 2 | 3 | 4 | 5;
  mana3?: 0 | 1 | 2 | 3 | 4 | 5;

  constructor(
    private game: GameStateService,
    public cardOp: CardOpServiceNew,
    public win: WindowsService,
  ) {}

  ngOnInit() {
    this.winSub = this.win.change$.subscribe(() => this.card = this.win.customDialog.card);
    this.card = this.win.customDialog.card
  }

  ngOnDestroy() {
    this.winSub?.unsubscribe();
  }

  cancel() {
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
