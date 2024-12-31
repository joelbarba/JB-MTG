import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { BfConfirmService, BfDnDModule, BfDnDService, BfUiLibModule } from 'bf-ui-lib';
import { GameCardComponent } from "../game-card/game-card.component";
import { ManaArrayComponent } from "../mana-array/mana-array.component";
import { CardOpServiceNew } from '../cardOp.service';

@Component({
  selector    : 'dialog-selecting-mana',
  templateUrl : './dialog-selecting-mana.component.html',
  styleUrl    : './dialog-selecting-mana.component.scss',
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
})
export class DialogSelectingManaComponent {

  constructor(public cardOp: CardOpServiceNew) {}

  numArr(num: number): Array<number> { return Array.from(Array(num).keys()) }
}
