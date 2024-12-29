import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { BfConfirmService, BfDnDModule, BfDnDService, BfUiLibModule } from 'bf-ui-lib';
import { GameCardComponent } from "../game-card/game-card.component";
import { ManaArrayComponent } from "../mana-array/mana-array.component";
import { CardOpService } from '../cardOp.service';
import { TCast } from '../../../../core/types';

@Component({
  selector    : 'dialog-selecting-extra-mana',
  templateUrl : './dialog-selecting-extra-mana.component.html',
  styleUrl    : './dialog-selecting-extra-mana.component.scss',
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
export class DialogSelectingExtraManaComponent {

  constructor(public cardOp: CardOpService) {}

  numArr(num: number): Array<number> { return Array.from(Array(num).keys()) }

  totalMana(cast?: TCast) {    
    return cast ? cast.reduce((a, v) => a + v, 0) : 0;
  }

}
