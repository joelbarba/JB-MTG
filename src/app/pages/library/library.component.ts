import { Component, HostListener, ViewEncapsulation } from '@angular/core';
import { AuthService } from '../../core/common/auth.service';
import { ShellService } from '../../shell/shell.service';
import { CommonModule } from '@angular/common';
import { Firestore, QuerySnapshot, QueryDocumentSnapshot, DocumentData, setDoc, updateDoc } from '@angular/fire/firestore';
import { getDocs, getDoc, collection, doc } from '@angular/fire/firestore';
import { Observable } from 'rxjs';
import { collectionData } from 'rxfire/firestore';
import { TCard } from '../../core/types';
import { FormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { BfConfirmService, BfListHandler, BfUiLibModule } from '@blueface_npm/bf-ui-lib';
import { EPhase, TGameState, TGameCard, TExtGameCard, TPlayer, TAction, TCast } from '../../core/types';
import { ManaArrayComponent } from "../games-room/game/mana-array/mana-array.component";
import { MtgCardComponent } from '../../core/common/internal-lib/mtg-card/mtg-card.component';
import { cardOrderFn, cardTypes, colors } from '../../core/common/commons';
import { Router } from '@angular/router';
import { DataService, TFullCard } from '../../core/dataService';



@Component({
  selector: 'app-library',
  standalone: true,
  imports: [
    CommonModule,
    TranslateModule,
    FormsModule,
    BfUiLibModule,
    MtgCardComponent,
],
  templateUrl: './library.component.html',
  styleUrl: './library.component.scss',
  encapsulation: ViewEncapsulation.None,
})
export class LibraryComponent {
  hoveringCard: TFullCard | null = null;
  selectedCard: TFullCard | null = null;

  cardsList!: BfListHandler;

  colors = colors;
  cardTypes = cardTypes;

  constructor(
    private shell: ShellService,
    private auth: AuthService,
    private firestore: Firestore,
    private router: Router,
    private dataService: DataService,
  ) {
    this.shell.gameMode('off');
    this.cardsList = new BfListHandler({
      listName      : 'cards-list',
      filterFields  : ['name'],
      orderFields   : ['id'],
      orderReverse  : false,
      rowsPerPage   : 50000,
    });
    // this.cardsList.orderList = cardOrderList;
    this.cardsList.orderList = (list) => list.sort(cardOrderFn);
  }

  async ngOnInit() {
    await this.dataService.loadPromise;
    this.cardsList.load(this.dataService.cards);
    this.cardsList.subscribeTo(this.dataService.cards$);
    this.cardsList.loadingStatus = 2;
    this.hoverCard(this.cardsList.loadedList[0]);
  }

  ngOnDestroy() {
    this.cardsList.destroy();
  }

  hoverCard(card?: TFullCard) {
    this.hoveringCard = card || this.selectedCard;
  }

  filterReadyToPlay(value: boolean) {
    if (value) {
      this.cardsList.filter(true, 'readyToPlay');
    } else {
      this.cardsList.resetFilters();
    }
  }

  selectCard(card?: TFullCard) {
    console.log(card);
    this.selectedCard = card || null;
    this.hoverCard(card);
  }

  goToCard(card: TFullCard) {
    this.router.navigate(['library/', card.id]);
  }

  // @HostListener('window:keyup', ['$event'])
  // keyEvent(ev: KeyboardEvent) {
  //   const CARDS_PER_ROW = 14; // TODO: Calculate that dynamically
  //   // console.log(ev.code);
  //   if (ev.code === 'ArrowLeft' || ev.code === 'ArrowRight' || ev.code === 'ArrowDown' || ev.code === 'ArrowUp') {
  //     const list = this.cardsList.loadedList;
  //     const ind = list.indexOf(this.selectedCard);
  //     if (ev.code === 'ArrowLeft')  { this.selectedCard = list[Math.max(ind - 1, 0)]; }
  //     if (ev.code === 'ArrowRight') { this.selectedCard = list[Math.min(ind + 1, list.length - 1)]; }
  //     if (ev.code === 'ArrowDown')  { this.selectedCard = list[Math.min(ind + CARDS_PER_ROW, list.length - 1)]; }
  //     if (ev.code === 'ArrowUp')    { this.selectedCard = list[Math.max(ind - CARDS_PER_ROW, 0)]; }
  //     this.selectCard(this.selectedCard || undefined);
  //   }
  //   // if (ev.code === 'Enter' || ev.code === 'NumpadEnter') { this.selectCard(this.selectedCard || undefined); }
  //   ev.stopPropagation();
  // }

}
