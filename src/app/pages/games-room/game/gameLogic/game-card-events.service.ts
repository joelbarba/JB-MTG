import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';
import { TGameCard } from '../../../../core/types';
import { CardOpServiceNew } from './cardOp.service';
import { WindowsService } from './windows.service';


@Injectable({ providedIn: 'root' })
export class GameCardEventsService {

  hoverCard$ = new Subject<TGameCard | null>;   // .next() every time a card is hovered


  constructor(
    private cardOp: CardOpServiceNew,
    private win: WindowsService,
  ) {}

  selectCard(card: TGameCard) {
    if (this.cardOp.status === 'selectingTargets') {
      if (this.cardOp.possibleTargets.find(t => t === card.gId)) {
        this.cardOp.selectTargets([card.gId]);
      }
    }
    else if (card.selectableAction) { // You can't action when selecting targets
      if (card.selectableAction.action === 'select-defending-creature') {
        this.win.combatDialog.maximize();
      }
      this.cardOp.startNew(card.gId, card.selectableAction.action, card.selectableAction.params);
    }
  }

}


