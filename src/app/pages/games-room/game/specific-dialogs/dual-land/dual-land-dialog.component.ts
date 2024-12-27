import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { BfConfirmService, BfDnDModule, BfDnDService, BfUiLibModule } from 'bf-ui-lib';
import { ManaArrayComponent } from '../../mana-array/mana-array.component';
import { GameCardComponent } from '../../game-card/game-card.component';
import { TCast, TGameCard } from '../../../../../core/types';
import { ManaIconComponent } from "../../mana-icon/mana-icon.component";
import { GameStateService } from '../../../game-state.service';


@Component({
  selector    :   'dual-land-dialog',
  templateUrl : './dual-land-dialog.component.html',
  styleUrl    : './dual-land-dialog.component.scss',
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
export class DualLandDialogComponent {
  @Input({ required: true }) card!: TGameCard;

  mana1!: 0 | 1 | 2 | 3 | 4 | 5;
  mana2!: 0 | 1 | 2 | 3 | 4 | 5;

  constructor(
    private game: GameStateService,
  ) {}

  ngOnChanges() {
    switch (this.card.name.replaceAll(' ', '')) {
      case 'Bayou':           this.mana1 = 3; this.mana2 = 5; break;
      case 'Badlands':        this.mana1 = 3; this.mana2 = 4; break;
      case 'Plateau':         this.mana1 = 2; this.mana2 = 4; break;
      case 'Savannah':        this.mana1 = 2; this.mana2 = 5; break;
      case 'Scrubland':       this.mana1 = 2; this.mana2 = 3; break;
      case 'Taiga':           this.mana1 = 4; this.mana2 = 5; break;
      case 'TropicalIsland':  this.mana1 = 1; this.mana2 = 5; break;
      case 'Tundra':          this.mana1 = 1; this.mana2 = 2; break;
      case 'UndergroundSea':  this.mana1 = 1; this.mana2 = 3; break;
      case 'VolcanicIsland':  this.mana1 = 1; this.mana2 = 4; break;
      default: this.mana1 = 1; this.mana2 = 1;
    }
  }

  cancel() {
    this.game.action('cancel-op');
  }  
  
  select(mana: 0 | 1 | 2 | 3 | 4 | 5) {
    const params = { gId: this.card.gId, targets: ['custom-color-' + mana] };
    this.game.action('trigger-ability', params);
  }
}
