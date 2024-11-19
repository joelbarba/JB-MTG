import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { BfConfirmService, BfDnDModule, BfDnDService, BfUiLibModule } from '@blueface_npm/bf-ui-lib';
import { ISummonOp } from '../game.component';

@Component({
  selector: 'mana-array',
  standalone: true,
  imports: [
    CommonModule,
    BfDnDModule,
    TranslateModule,
    FormsModule,
    BfUiLibModule,    
  ],
  templateUrl: './mana-array.component.html',
  styleUrl: './mana-array.component.scss'
})
export class ManaArrayComponent {

  @Input({ required: true }) mana!: [number, number, number, number, number, number];

  numArr(num: number): Array<number> { return Array.from(Array(num).keys()) }
}
