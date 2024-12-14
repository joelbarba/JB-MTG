import { Component, HostListener, ViewEncapsulation } from '@angular/core';
import { AuthService } from '../../core/common/auth.service';
import { ShellService } from '../../shell/shell.service';
import { CommonModule, formatNumber } from '@angular/common';
import { Firestore, QuerySnapshot, QueryDocumentSnapshot, DocumentData, setDoc, updateDoc, deleteDoc } from '@angular/fire/firestore';
import { getDocs, getDoc, collection, doc } from '@angular/fire/firestore';
import { Observable, Subscription } from 'rxjs';
import { collectionData } from 'rxfire/firestore';
import { TCard, TDeckRef } from '../../core/types';
import { FormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { BfConfirmService, BfGrowlService, BfListHandler, BfUiLibModule } from 'bf-ui-lib';
import { MtgCardComponent } from '../../core/common/internal-lib/mtg-card/mtg-card.component';
import { cardOrderFn, unitOrderFn, cardTypes, colors, randomUnitId } from '../../core/common/commons';
import { HoverTipDirective } from '../../core/common/internal-lib/bf-tooltip/bf-tooltip.directive';
import { DataService, TFullCard, TFullDeck, TFullUnit } from '../../core/dataService';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { SellOfferModalComponent } from '../../core/modals/sellOfferModal/sell-offer-modal.component';
import { ActivatedRoute } from '@angular/router';



@Component({
  selector: 'app-your-cards',
  standalone: true,
  imports: [
    CommonModule,
    TranslateModule,
    FormsModule,
    BfUiLibModule,
    MtgCardComponent,
    HoverTipDirective,
  ],
  templateUrl: './your-cards.component.html',
  styleUrl: './your-cards.component.scss',
  encapsulation: ViewEncapsulation.None,
})
export class YourCardsComponent {
  cardsList!: BfListHandler;

  groupedCards: Array<TFullCard> = [];    // All your cards grouped (all your units together)
  yourUnits: Array<TFullUnit> = [];       // All your units
  
  hoveringCard: TFullCard | null = null;
  hoveringUnit: TFullUnit | null = null;
  hoverFromDeck = false;  // Whether the card/unit you are hovering is from your cards list (false) of from a deck card editor (true)

  selCard: TFullCard | null = null;   // Current selected card
  selUnit: TFullUnit | null = null;   // Current selected unit

  isGrouped = true;       // Whether your cards list is grouped (true) or displaying all your units seperately (false)
  isDeckGrouped = true;   // Whether the cards in the selected deck are displayed grouped (true) or seperately (false)

  colors = colors;
  cardTypes = cardTypes;

  showDecks = false;


  decks: Array<TFullDeck> = [];     // All your decks ---> deck.cards = Array<TFullUnit>
  selDeck?: TFullDeck;              // Current selected deck
  deckName = '';

  deckGroupedCards: Array<TFullCard> = [];  // Cards of the selected deck grouped (all units of the same card together)

  subs: Array<Subscription> = [];


  constructor(
    private shell: ShellService,
    private auth: AuthService,
    private firestore: Firestore,
    private growl: BfGrowlService,
    private confirm: BfConfirmService,
    private dataService: DataService,
    private ngbModal: NgbModal,
    private route: ActivatedRoute,
  ) {
    this.shell.gameMode('off');
    this.cardsList = new BfListHandler({
      listName      : 'cards-list',
      filterFields  : ['name'],
      orderFields   : ['id'],
      orderReverse  : false,
      rowsPerPage   : 50000,
    });
    this.cardsList.orderList = (list) => list.sort(cardOrderFn);
    this.cardsList.filterList = (list: Array<any>, filterText = ''): Array<any> => {
      if (!this.isGrouped) {
        if (this.cardsList.filters.cardType) { list = list.filter(u => u.card.type === this.cardsList.filters.cardType); }
        if (this.cardsList.filters.color)    { list = list.filter(u => u.card.color === this.cardsList.filters.color); }
      }
      return this.cardsList.defaultFilterList(list, filterText, ['name']);
    };
  }

  async ngOnInit() {
    if (this.route.snapshot?.routeConfig?.path === 'decks') { this.showDecks = true; }
    const deckId = this.route.snapshot.paramMap.get('deckId') || '';

    await this.auth.profilePromise;
    await this.dataService.loadPromise;

    this.subs.push(this.dataService.cards$.subscribe(cards => this.loadCards()));
    this.subs.push(this.dataService.yourDecks$.subscribe(decks => this.loadDecks()));

    this.selectCard(this.groupedCards[0]);
    

    await this.dataService.yourDecksPromise;
    if (deckId) {
      console.log('DECK ID', deckId);
      const deck = this.decks.find(d => d.id === deckId);
      if (deck) { this.showDecks = true; this.editDeck(deck); }
    }
  }

  ngOnDestroy() {
    this.cardsList.destroy();
    this.subs.forEach(sub => sub.unsubscribe())
  }

  loadCards() {
    this.groupedCards = this.dataService.cards.filter(c => c.units.some(u => u.ownerId === this.auth.profileUserId));
    this.yourUnits = [];
    this.groupedCards.forEach(card => {
      card.units = card.units.filter(u => u.ownerId === this.auth.profileUserId);
      card.units.forEach(unit => this.yourUnits.push(unit));
    });
    // console.log('Your Grouped Cards', this.groupedCards);
    // console.log('Your Units', this.yourUnits);
    this.switchGrouped();
  }

  async loadDecks() {
    this.decks = this.dataService.yourDecks.map(deck => {
      return { id: deck.id, deckName: deck.deckName, units: deck.units.sort(unitOrderFn) };
    })
  }

  private loadGroupDeck() {
    if (this.selDeck) {
      this.deckGroupedCards = [];
      this.selDeck.units.forEach(unit => {
        const card = this.groupedCards.find(c => c.id === unit.cardId);
        const deckCard = this.deckGroupedCards.find(c => c.id === unit.cardId);
        if (deckCard) { deckCard.units.push(unit); } // Add another unit
        else if (card) { this.deckGroupedCards.push({ ...card, units: [unit] }); } // Push the whole card
      });
    }
  }


  switchGrouped() {
    if (this.isGrouped) {
      this.cardsList.orderList = (list) => list.sort(cardOrderFn);
      this.cardsList.load(this.groupedCards);
    } else {
      this.cardsList.orderList = (list) => list.sort(unitOrderFn);
      this.cardsList.load(this.yourUnits);
    }    
  }

  filterReadyToPlay(value: boolean) {
    if (value) {
      this.cardsList.filter(true, 'readyToPlay');
    } else {
      this.cardsList.resetFilters();
    }
  }


  switchShowDecks() {
    this.showDecks = !this.showDecks;
    if (!this.showDecks) { 
      this.selDeck = undefined; 
      window.history.replaceState(null, 'Your Cards', '/cards');
    } else {
      window.history.replaceState(null, 'Your Decks', '/cards/decks');
    }
  }

  hoverCard(card?: TFullCard, fromDeck = false) {
    this.hoveringCard = card || this.selCard;
    this.hoveringUnit = this.hoveringCard ? null : this.selUnit;
    this.hoverFromDeck = fromDeck;
  }

  hoverUnit(unit?: TFullUnit, fromDeck = false) {
    this.hoveringUnit = unit || this.selUnit;
    this.hoveringCard = this.hoveringUnit ? null : this.selCard;
    this.hoverFromDeck = fromDeck;
  }

  unitsInDeck(cardId: string): number { // Number of units in the deck
    if (!this.selDeck || !this.showDecks) { return 0; }
    return this.selDeck.units.filter(c => c.cardId === cardId).length;
  }

  isCardInDeck(card: TFullCard): boolean {
    if (!this.selDeck || !this.showDecks) { return false; }
    return !!card.units.every(u => this.selDeck?.units.find(du => du.ref === u.ref));
  }

  isUnitInDeck(card: TFullUnit): boolean {
    if (!this.selDeck || !this.showDecks) { return false; }
    return !!this.selDeck?.units.find(c => c.ref === card.ref);
  }

  selectUnit(unit: TFullUnit) {
    this.selUnit = unit;
    this.selCard = null;
    this.hoverUnit(unit);
    this.moveUnitToDeck(unit);
  }

  selectCard(card: TFullCard) {
    this.selCard = card;
    this.selUnit = null;
    this.hoverCard(card);
    if (this.showDecks && this.selDeck && !this.isCardInDeck(card)) { // If not all units are in the deck
      const unit = card.units.find(u => !this.selDeck?.units.find(du => du.ref === u.ref)); // Find a unit that is not already in the deck
      if (unit) { this.moveUnitToDeck(unit); } // Add it to the deck
    }
  }

  // Add / Remove a unit card to/from the selected deck
  private moveUnitToDeck(unit: TFullUnit) {
    if (this.showDecks && this.selDeck) {
      if (!this.isUnitInDeck(unit)) { // Add it to the deck

        if (!unit.card.readyToPlay) {
          return this.growl.error(`Sorry, ${unit.card.name} is still not ready to play :(`);
        }
        if (unit.card.maxInDeck && unit.card.maxInDeck <= this.selDeck.units.filter(u => u.cardId === unit.card.id).length) {
          return this.growl.error(`You cannot have more than ${unit.card.maxInDeck} ${unit.card.name} in a deck`);
        }
        console.log(`Adding ${unit.card.name} (${unit.ref}) to the deck`);
        this.growl.success(`${unit.card.name} added to the deck`);
        this.selDeck.units.push({ ...unit });
        this.selDeck.units.sort(unitOrderFn);


      } else { // Remove it from the deck
        this.removeUnitFromDeck(unit);
      }
      this.loadGroupDeck();
    }
  }

  // @HostListener('window:keyup', ['$event'])
  // keyEvent(ev: KeyboardEvent) {
  //   const CARDS_PER_ROW = 7; // TODO: Calculate that dynamically
  //   // console.log(ev.code);
  //   if (ev.code === 'ArrowLeft' || ev.code === 'ArrowRight' || ev.code === 'ArrowDown' || ev.code === 'ArrowUp') {
  //     const list = this.cardsList.loadedList;
  //     if (this.isGrouped) {
  //       const ind = list.indexOf(list.find(c => c.id === this.selCard?.id)) || 0;
  //       if (ev.code === 'ArrowLeft')  { this.selCard = list[Math.max(ind - 1, 0)]; }
  //       if (ev.code === 'ArrowRight') { this.selCard = list[Math.min(ind + 1, list.length - 1)]; }
  //       if (ev.code === 'ArrowDown')  { this.selCard = list[Math.min(ind + CARDS_PER_ROW, list.length - 1)]; }
  //       if (ev.code === 'ArrowUp')    { this.selCard = list[Math.max(ind - CARDS_PER_ROW, 0)]; }
  //       if (this.selCard) { this.hoverCard(this.selCard); this.selUnit = null; }
  //     }
  //     else {
  //       const ind = list.indexOf(list.find(c => c.ref === this.selUnit?.ref)) || 0;
  //       if (ev.code === 'ArrowLeft')  { this.selUnit = list[Math.max(ind - 1, 0)]; }
  //       if (ev.code === 'ArrowRight') { this.selUnit = list[Math.min(ind + 1, list.length - 1)]; }
  //       if (ev.code === 'ArrowDown')  { this.selUnit = list[Math.min(ind + CARDS_PER_ROW, list.length - 1)]; }
  //       if (ev.code === 'ArrowUp')    { this.selUnit = list[Math.max(ind - CARDS_PER_ROW, 0)]; }
  //       if (this.selUnit) { this.hoverUnit(this.selUnit); this.selCard = null; }
  //     }
  //   }
  //   // ev.code === 'Space'
  //   if (ev.code === 'Enter' || ev.code === 'NumpadEnter') {
  //     if (this.isGrouped && this.selCard) { this.selectCard(this.selCard); }
  //     if (!this.isGrouped && this.selUnit) { this.selectUnit(this.selUnit); }
  //   }
  //   ev.stopPropagation();
  // }






  createNewDeck() {
    this.editDeck({ id: randomUnitId(), deckName: 'New Deck', units: [] });
  }

  editDeck(deck: TFullDeck) {
    this.selDeck = deck;
    this.deckName = deck.deckName;
    this.loadGroupDeck();
    window.history.pushState(null, 'Your Deck', `/cards/decks/${deck.id}`);
  }

  goBackToDecks() {
    this.selDeck = undefined; 
    this.loadDecks();
    window.history.pushState(null, 'Your Decks', `/cards/decks`);
  }

  deckTotals() {
    if (this.selDeck) {
      return { 
        total     : this.selDeck.units.length,
        lands     : this.selDeck.units.filter(c => c.card.type === 'land').length,
        noLands   : this.selDeck.units.filter(c => c.card.type !== 'land').length,
        creatures : this.selDeck.units.filter(c => c.card.type === 'creature').length,
      };
    } else { return { total: 0, lands: 0, noLands: 0, creatures : 0 }; }
  }



  removeUnitFromDeck(unit: TFullUnit) {
    if (this.selDeck) {
      console.log(`Removing ${unit.card.name} (${unit.ref}) from the deck`);
      this.growl.error(`${unit.card.name} removed from the deck`);
      const ind = this.selDeck.units.map(c => c.ref).indexOf(unit.ref);
      this.selDeck.units.splice(ind, 1);
      this.selDeck.units.sort(unitOrderFn);
      const groupedCard = this.deckGroupedCards.find(c => c.id === unit.cardId);
      if (groupedCard) {
        groupedCard.units.splice(groupedCard.units.map(c => c.ref).indexOf(unit.ref), 1);
        if (!groupedCard.units.length) { // If all units are gone
          this.deckGroupedCards.splice(this.deckGroupedCards.indexOf(groupedCard), 1);
        }
      }
    }
  }

  removeCardFromDeck(card: TFullCard) {
    if (this.selDeck && card.units.length) {
      const deckUnits = this.selDeck.units.filter(du => du.cardId === card.id);
      const unitToRemove = deckUnits[deckUnits.length - 1];
      this.removeUnitFromDeck(unitToRemove);
    }
  }

  deleteDeck(deck: TFullDeck) {
    this.confirm.open({
      title            : 'Delete Deck',
      htmlContent      : `Are you sure you want to delete your deck <b>${deck.deckName}</b>?`,
      yesButtonText    : 'Yes, delete it',
    }).then(res => { if (res === 'yes' && this.auth.profileUserId) {
      deleteDoc(doc(this.firestore, 'users', this.auth.profileUserId, 'decks', deck.id)).then(() => {
        this.growl.success(`Deck ${deck.deckName} deleted`);
        this.loadDecks();
      });
    }});
  }

  async saveDeck() {
    if (this.selDeck && this.auth.profileUserId) {
      this.selDeck.deckName = this.deckName;
      const dbDeck = {
        id       : this.selDeck.id,
        deckName : this.selDeck.deckName,
        units    : this.selDeck.units.map(card => card.ref),
      }
      console.log('Saving Card', dbDeck);
      await setDoc(doc(this.firestore, 'users', this.auth.profileUserId, 'decks', dbDeck.id), dbDeck);
      this.growl.success(`Deck saved`);
    }
  }


  async askSellUnit(unit: TFullUnit) {
    const modalRef = this.ngbModal.open(SellOfferModalComponent, { backdrop: 'static', centered: false, size: 'md' });
    modalRef.componentInstance.unit = unit;
  }


}



