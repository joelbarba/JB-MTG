import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { Subscription } from 'rxjs';
import { BfDnDModule, BfUiLibModule } from 'bf-ui-lib';
import { GameCardComponent } from '../../game-card/game-card.component';
import { TGameCard } from '../../../../../core/types';
import { GameStateService } from '../../gameLogic/game-state.service';
import { CardOpServiceNew } from '../../gameLogic/cardOp.service';
import { WindowsService } from '../../gameLogic/windows.service';


@Component({
  selector    :   'reconstruction-dialog',
  templateUrl : './reconstruction-dialog.component.html',
  styleUrl    : './reconstruction-dialog.component.scss',
  standalone: true,
  imports: [
    CommonModule,
    BfDnDModule,
    TranslateModule,
    FormsModule,
    BfUiLibModule,
    GameCardComponent,
  ],
})
export class ReconstructionDialogComponent {
  card: TGameCard | null = null;
  winSub!: Subscription;
  selectableArtifacts: Array<TGameCard> = [];


  constructor(
    public cardOp: CardOpServiceNew,
    public game: GameStateService,
    public win: WindowsService,
  ) {}

  ngOnInit() {
    this.winSub = this.win.change$.subscribe(() => this.onCardUpdate());
    this.onCardUpdate();
  }

  ngOnDestroy() {
    this.winSub?.unsubscribe();
  }

  ngOnChanges() {}

  onCardUpdate() {
    this.card = this.win.customDialog.card;
    this.selectableArtifacts = this.game.state.cards.filter(c => c.location === this.game.yourGrav() && c.isType('artifact'));
  }

  
  selectCard(gId: string) {
    this.cardOp.selectTargets([gId]);
  }
}
