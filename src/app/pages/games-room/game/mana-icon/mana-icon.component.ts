import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { BfConfirmService, BfDnDModule, BfDnDService, BfUiLibModule } from 'bf-ui-lib';
import { ISummonOp } from '../game.component';

@Component({
  selector: 'mana-icon',
  standalone: true,
  imports: [
    CommonModule,
    BfDnDModule,
    TranslateModule,
    FormsModule,
    BfUiLibModule,    
  ],
  templateUrl: './mana-icon.component.html',
  styleUrl: './mana-icon.component.scss'
})
export class ManaIconComponent {

  // 0='uncolored', 1='blue', 2='white',  3='black', 4='red', 5='green';
  @Input({ required: true }) mana?: 0 | 1 | 2 | 3 | 4 | 5;

}
