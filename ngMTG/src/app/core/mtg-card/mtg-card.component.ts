import {Component, OnInit, Input, OnChanges, OnDestroy} from '@angular/core';
import {StoreService} from '../store.service';

@Component({
  selector: 'mtg-card',
  templateUrl: './mtg-card.component.html',
  styleUrls: ['./mtg-card.component.scss'],
})
export class MtgCardComponent implements OnInit, OnChanges, OnDestroy {
  @Input() cardImg: string;
  @Input() cardId: string;

  public img = '';

  // Reload card when library changes
  private readonly sub = this.store.cards$.subscribe(cards => {
    if (this.cardImg) { this.img = this.cardImg; }
    const card = cards.getById(this.cardId);
    if (card) { this.img = card.image; }
  });

  constructor(private store: StoreService) {}

  ngOnInit() { }

  ngOnChanges() {
    if (this.cardId && this.store.cards) {  // Reload card when Id changes
      const card = this.store.cards.getById(this.cardId);
      if (card) { this.img = card.image; }
    }
  }

  ngOnDestroy() {
    if (this.sub) { this.sub.unsubscribe(); }
  }

}
