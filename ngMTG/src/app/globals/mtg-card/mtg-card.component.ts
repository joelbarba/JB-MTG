import { Component, OnInit, Input, ViewEncapsulation } from '@angular/core';

@Component({
  selector: 'mtg-card',
  templateUrl: './mtg-card.component.html',
  styleUrls: ['./mtg-card.component.scss'],
  // encapsulation: ViewEncapsulation.None
})
export class MtgCardComponent implements OnInit {

  @Input() cardImg: string;

  constructor() { }

  ngOnInit() {
  }

}
