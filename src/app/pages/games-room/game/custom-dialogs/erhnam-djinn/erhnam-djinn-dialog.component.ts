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


@Component({
  selector    :   'erhnam-djinn-dialog',
  templateUrl : './erhnam-djinn-dialog.component.html',
  styleUrl    : './erhnam-djinn-dialog.component.scss',
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
export class ErhnamDjinnDialogComponent {
  card: TGameCard | null = null;
  winSub!: Subscription;
  selectableCreatures: Array<TGameCard> = [];


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
    if (this.card) {
      const possibleTargets = this.card.getUpkeepCost(this.game.state)?.possibleTargets || [];
      this.selectableCreatures = this.game.state.cards.filter(c => possibleTargets.indexOf(c.gId) >= 0);
      // this.selectableCreatures = this.game.state.cards.filter(c => c.location === 'tble1' || c.location === 'tble2');
    }
  }

  
  selectCreature(gId: string) {
    this.cardOp.selectTargets([gId]);
  }
}
