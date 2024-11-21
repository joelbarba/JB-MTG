import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { BfConfirmService, BfDnDModule, BfDnDService, BfUiLibModule } from '@blueface_npm/bf-ui-lib';
import { ISummonOp } from '../game.component';
import { GameCardComponent } from "../game-card/game-card.component";
import { ManaArrayComponent } from "../mana-array/mana-array.component";

@Component({
  selector: 'dialog-selecting-mana',
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
  templateUrl: './dialog-selecting-mana.component.html',
  styleUrl: './dialog-selecting-mana.component.scss'
})
export class DialogSelectingManaComponent {

  @Input() summonOp!: ISummonOp;

  numArr(num: number): Array<number> { return Array.from(Array(num).keys()) }
}
