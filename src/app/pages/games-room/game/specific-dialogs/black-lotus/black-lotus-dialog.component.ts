import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { BfConfirmService, BfDnDModule, BfDnDService, BfUiLibModule } from 'bf-ui-lib';
import { ManaArrayComponent } from '../../mana-array/mana-array.component';
import { GameCardComponent } from '../../game-card/game-card.component';


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
    ManaArrayComponent,
  ],
  templateUrl: './black-lotus-dialog.component.html',
  styleUrl: './black-lotus-dialog.component.scss'
})
export class DialogSelectingManaComponent {

  constructor() {
    
  }
}
