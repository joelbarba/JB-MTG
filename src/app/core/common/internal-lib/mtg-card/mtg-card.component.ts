import { Component, Input } from '@angular/core';
import { TCard } from '../../../types';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'mtg-card',
  standalone: true,
  imports: [
    CommonModule,
    // TranslateModule,
  ],
  templateUrl: './mtg-card.component.html',
  styleUrl: './mtg-card.component.scss'
})
export class MtgCardComponent {
  // @Input() card!: TCard | null;
  @Input() cardImg?: string;
  @Input() back = false;
  @Input() border?: 'white' | 'black' = 'white';
  @Input() isDraggable = false;

  constructor() {
  }

  ngOnInit() {
  }

}
