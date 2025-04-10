import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { Subscription } from 'rxjs';
import { BfDnDModule, BfUiLibModule } from 'bf-ui-lib';
import { GameCardComponent } from '../../game-card/game-card.component';
import { TGameCard } from '../../../../../core/types';
import { ManaIconComponent } from "../../mana-icon/mana-icon.component";
import { GameStateService } from '../../gameLogic/game-state.service';
import { CardOpServiceNew } from '../../gameLogic/cardOp.service';
import { WindowsService } from '../../gameLogic/windows.service';
import { HoverTipDirective } from '../../../../../core/common/internal-lib/bf-tooltip/bf-tooltip.directive';


@Component({
  selector    :   'library-of-alexandria-dialog',
  templateUrl : './library-of-alexandria-dialog.component.html',
  styleUrl    : './library-of-alexandria-dialog.component.scss',
  standalone: true,
  imports: [
    CommonModule,
    BfDnDModule,
    TranslateModule,
    FormsModule,
    BfUiLibModule,
    GameCardComponent,
    ManaIconComponent,
    HoverTipDirective,
  ],
})
export class LibraryOfAlexandriaDialogComponent {
  @Input() fix = false;
  card: TGameCard | null = null;
  winSub!: Subscription;

  youHave7Cards = false;

  constructor(
    public cardOp: CardOpServiceNew,
    public win: WindowsService,
    public game: GameStateService,
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
    this.youHave7Cards = this.game.state.cards.filter(c => c.location === this.game.yourHand()).length === 7;
  }

  selectMana() {
    this.cardOp.selectTargets(['mana']);
  }

  selectDraw() {
    this.cardOp.selectTargets(['draw']);
  }
  
}
