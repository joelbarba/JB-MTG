import { Component, HostListener, ViewEncapsulation } from '@angular/core';
import { AuthService } from '../../core/common/auth.service';
import { ShellService } from '../../shell/shell.service';
import { CommonModule, formatNumber } from '@angular/common';
import { Firestore, QuerySnapshot, QueryDocumentSnapshot, DocumentData, setDoc, updateDoc } from '@angular/fire/firestore';
import { getDocs, getDoc, collection, doc } from '@angular/fire/firestore';
import { Observable, Subscription } from 'rxjs';
import { collectionData } from 'rxfire/firestore';
import { FormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { BfConfirmService, BfGrowlService, BfListHandler, BfUiLibModule } from 'bf-ui-lib';
import { EPhase, TGameState, TGameCard, TExtGameCard, TPlayer, TAction, TCast } from '../../core/types';
import { ManaArrayComponent } from "../games-room/game/mana-array/mana-array.component";
import { MtgCardComponent } from '../../core/common/internal-lib/mtg-card/mtg-card.component';
import { cardOrderFn, cardTypes, colors } from '../../core/common/commons';
import { Router } from '@angular/router';
import { DataService, TFullCard, TFullUnit } from '../../core/dataService';



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

  subs: Array<Subscription> = [];

  constructor(
    public auth: AuthService,
    private shell: ShellService,
    private firestore: Firestore,
    private router: Router,
    private dataService: DataService,
    private growl: BfGrowlService,
    private confirm: BfConfirmService,
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
    this.cardsList.filters.readyToPlay = true;
    this.cardsList.orderList = (list) => list.sort(cardOrderFn);
  }

  async ngOnInit() {
    await this.dataService.loadPromise;
    this.cardsList.load(this.dataService.cards);
    this.subs.push(this.dataService.cards$.subscribe(cards => this.cardsList.load(cards)));
    this.cardsList.loadingStatus = 2;
    this.hoverCard(this.cardsList.loadedList[0]);
  }

  ngOnDestroy() {
    this.cardsList.destroy();
    this.subs.forEach(sub => sub.unsubscribe());
  }

  hoverCard(card?: TFullCard) {
    this.hoveringCard = card || this.selectedCard || this.hoveringCard;
    
    this.unitsForSale = this.hoveringCard?.units.filter(u => u.sellPrice !== null).length || 0;

  }

  unitsForSale = 0;  

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

  async buyBestUnit(card: TFullCard) {
    
    // Find the unit with the lower price
    let unit!: TFullUnit;
    let bestPrice = 0;
    card.units.forEach(u => {
      if (u.sellPrice !== null && (!bestPrice || u.sellPrice < bestPrice)) {
        unit = u; bestPrice = u.sellPrice;
      }
    });

    if (unit && unit.sellPrice !== null) {
      const sellPrice = unit.sellPrice;
      const formatPrice = formatNumber(sellPrice, 'en-US', '1.0-0');
      let htmlContent = `Buy 1 <b>${unit.card.name}</b> for <b>${formatPrice}</b> sats?`;
      const res = await this.confirm.open({ 
        title: `Buy "${unit.card.name}" (${unit.ref})`, 
        htmlContent, 
        yesButtonText: 'Yes, buy it',
        showNo: true, noButtonText: 'No, more options'
      });
      if (res === 'yes') {
        const error = await this.dataService.buyUnit(unit);
        if (error) { this.growl.error(error); }
        else { this.growl.success(`${unit.card?.name} bought for ${formatNumber(sellPrice || 0, 'en-US', '1.0-0')} sats`); }

      } else if (res === 'no') {
        this.goToCard(card);
      }
    }
  }

  // @HostListener('window:keyup', ['$event'])
  // keyEvent(ev: KeyboardEvent) {
    // if (ev.code === 'KeyY')  { console.log('pressing Y'); }
    // const CARDS_PER_ROW = 14; // TODO: Calculate that dynamically
    // // console.log(ev.code);
    // if (ev.code === 'ArrowLeft' || ev.code === 'ArrowRight' || ev.code === 'ArrowDown' || ev.code === 'ArrowUp') {
    //   const list = this.cardsList.loadedList;
    //   const ind = list.indexOf(this.selectedCard);
    //   if (ev.code === 'ArrowLeft')  { this.selectedCard = list[Math.max(ind - 1, 0)]; }
    //   if (ev.code === 'ArrowRight') { this.selectedCard = list[Math.min(ind + 1, list.length - 1)]; }
    //   if (ev.code === 'ArrowDown')  { this.selectedCard = list[Math.min(ind + CARDS_PER_ROW, list.length - 1)]; }
    //   if (ev.code === 'ArrowUp')    { this.selectedCard = list[Math.max(ind - CARDS_PER_ROW, 0)]; }
    //   this.selectCard(this.selectedCard || undefined);
    // }
    // if (ev.code === 'Enter' || ev.code === 'NumpadEnter') { this.selectCard(this.selectedCard || undefined); }
  //   ev.stopPropagation();
  // }

}
