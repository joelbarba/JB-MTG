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
  selector    :   'birds-of-paradise-dialog',
  templateUrl : './birds-of-paradise-dialog.component.html',
  styleUrl    : './birds-of-paradise-dialog.component.scss',
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
export class BirdsOfParadiseDialogComponent {
  card: TGameCard | null = null;
  winSub!: Subscription;
  title = 'Birds of Paradise';

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
  
  select(target: 'custom-color-1' | 'custom-color-2' | 'custom-color-3' | 'custom-color-4' | 'custom-color-5') {
    this.cardOp.selectTargets([target])
  }
}
