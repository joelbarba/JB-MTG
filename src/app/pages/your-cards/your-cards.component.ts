import { Component, HostListener, ViewEncapsulation } from '@angular/core';
import { AuthService } from '../../core/common/auth.service';
import { ShellService } from '../../shell/shell.service';
import { CommonModule } from '@angular/common';
import { Firestore, setDoc, deleteDoc, onSnapshot, QuerySnapshot, Unsubscribe } from '@angular/fire/firestore';
import { getDocs, getDoc, collection, doc } from '@angular/fire/firestore';
import { BehaviorSubject, debounceTime, Observable, Subject, Subscription, tap } from 'rxjs';
import { FormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { BfConfirmService, BfDnDModule, BfDnDService, BfGrowlService, BfListHandler, BfUiLibModule } from 'bf-ui-lib';
import { MtgCardComponent } from '../../core/common/internal-lib/mtg-card/mtg-card.component';
import { cardOrderFn, unitOrderFn, cardTypes, colors, randomUID, getTime } from '../../core/common/commons';
import { HoverTipDirective } from '../../core/common/internal-lib/bf-tooltip/bf-tooltip.directive';
import { DataService, TFullCard, TFullDeck, TFullUnit } from '../../core/dataService';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { SellOfferModalComponent } from '../../core/modals/sellOfferModal/sell-offer-modal.component';
import { ActivatedRoute } from '@angular/router';
import { BfTooltipService } from '../../core/common/internal-lib/bf-tooltip/bf-tooltip.service';
import { ManaArrayComponent } from "../games-room/game/mana-array/mana-array.component";
import { TDBUserDeck } from '../../core/types';



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
    BfDnDModule,
    // ManaArrayComponent,
],
  templateUrl: './your-cards.component.html',
  styleUrl: './your-cards.component.scss',
  encapsulation: ViewEncapsulation.None,
})
export class YourCardsComponent {
  cardsList!: BfListHandler;
  unitsList!: BfListHandler;

  groupedCards: Array<TFullCard> = [];    // All your cards grouped (all your units together)
  yourUnits: Array<TFullUnit> = [];       // All your units
  
  hoveringCard: TFullCard | null = null;
  hoveringUnit: TFullUnit | null = null;
  hoverFromDeck = false;  // Whether the card/unit you are hovering is from your cards list (false) of from a deck card editor (true)

  selCard: TFullCard | null = null;   // Current selected card
  selUnit: TFullUnit | null = null;   // Current selected unit

  isGrouped = true;       // Whether your cards list is grouped (true) or displaying all your units seperately (false)
  isDeckGrouped = false;  // Whether the cards in the selected deck are displayed grouped (true) or seperately (false)
  isRestricted = true;    // If false, you can add 4 cards of any type in the deck

  filterText = '';
  filterCardType = '';
  filterColor = '';
  filterEdition = '';
  filterReady = true;

  colors = colors;
  cardTypes = cardTypes;

  showDecks = false;
  deckSearch = '';

  deckAction = ''
  debounceName = new Subject();

  dragMode: 'add-card' | 'add-unit' | 'order-unit' | 'order-card' | 'del-unit' | 'del-card' | null = null;

  decks: Array<TFullDeck> = [];     // All your decks ---> deck.cards = Array<TFullUnit>
  selDeck?: TFullDeck;              // Current selected deck
  deckName = '';

  isSaving = false; // Whether a change is pending to be saved automatically

  deckGroupedCards: Array<TFullCard> = [];  // Cards of the selected deck grouped (all units of the same card together)

  subs: Array<Subscription> = [];

  userId = ''; // If showing the cards of a different user than this.auth.profileUserId (admin only)


  constructor(
    private shell: ShellService,
    public auth: AuthService,
    private firestore: Firestore,
    private growl: BfGrowlService,
    private confirm: BfConfirmService,
    private dataService: DataService,
    private ngbModal: NgbModal,
    private route: ActivatedRoute,
    private tooltipService: BfTooltipService,
    public bfDnD: BfDnDService,
  ) {
    this.shell.gameMode('off');
    this.cardsList = new BfListHandler({
      listName      : 'cards-list',
      filterFields  : ['name'],
      orderFields   : ['id'],
      orderReverse  : false,
      rowsPerPage   : 200,
    });    
    this.unitsList = new BfListHandler({
      listName      : 'units-list',
      filterFields  : ['name'],
      orderFields   : ['id'],
      orderReverse  : false,
      rowsPerPage   : 200,
    });    

    this.cardsList.orderList = (list) => list.sort(cardOrderFn);
    this.cardsList.filterList = (list: Array<any>, filterText = ''): Array<any> => {
      if (this.filterText)     { list = list.filter(c => (c.name + '').toLocaleLowerCase().indexOf(this.filterText.toLowerCase()) >= 0); }
      if (this.filterCardType) { list = list.filter(c => c.type === this.filterCardType); }
      if (this.filterColor)    { list = list.filter(c => c.color === this.filterColor); }
      if (this.filterReady)    { list = list.filter(c => c.readyToPlay === true); }
      return list;
    };
    
    this.unitsList.orderList = (list) => list.sort(unitOrderFn);
    this.unitsList.filterList = (list: Array<any>, filterText = ''): Array<any> => {
      if (this.filterText)     { list = list.filter(u => (u.card.name + '').toLocaleLowerCase().indexOf(this.filterText.toLowerCase()) >= 0); }
      if (this.filterCardType) { list = list.filter(u => u.card.type === this.filterCardType); }
      if (this.filterColor)    { list = list.filter(u => u.card.color === this.filterColor); }
      if (this.filterReady)    { list = list.filter(u => u.card.readyToPlay === true); }
      return list;
    };
  }


  async ngOnInit() {
    if (this.route.snapshot?.routeConfig?.path === 'decks') { this.showDecks = true; }
    const deckId = this.route.snapshot.paramMap.get('deckId') || '';

    await this.auth.profilePromise;
    await this.dataService.loadPromise;

    if (this.auth.isAdmin && this.route.snapshot.queryParams['userId']) {
      this.userId = this.route.snapshot.queryParams['userId'];
    }

    this.subs.push(this.dataService.cards$.subscribe(cards => this.loadCards()));
    this.loadAndWatchDecks();

    this.selectCard(this.groupedCards[0]);
    

    await this.dataService.yourDecksPromise;
    if (deckId) {
      // console.log('DECK ID', deckId);
      const deck = this.decks.find(d => d.id === deckId);
      if (deck) { this.showDecks = true; this.editDeck(deck); }
    }

    // Save deck after 1sec of name change
    this.debounceName.pipe(tap(c => this.isSaving = true), debounceTime(1000)).subscribe(name => this.saveDeck());

    
    // Drag & Drop events:
    this.subs.push(this.bfDnD.dragStart$.subscribe((ev:any) => {
      this.dragMode = ev.bfDragMode;  // Catch the bfDragMode of the draggable element (to be used when drop)
      this.tooltipService.flush();
      this.tooltipService.enabled = false;
    }));

    this.subs.push(this.bfDnD.dragEndOk$.subscribe((ev:any) => {
      this.tooltipService.enabled = true;
    }));

    this.subs.push(this.bfDnD.dragEndKo$.subscribe((ev:any) => {
      this.tooltipService.enabled = true;

      // If dragging a card out of the deck, remove it from the deck
      if (this.bfDnD.bfDragMode === 'order-unit') { this.removeUnitFromDeck(this.bfDnD.bfDraggable); }
      if (this.bfDnD.bfDragMode === 'order-card') { this.removeCardFromDeck(this.bfDnD.bfDraggable); }
    }));

  }

  otherDecksSub?: Unsubscribe;

  ngOnDestroy() {
    this.cardsList.destroy();
    this.unitsList.destroy();
    this.subs.forEach(sub => sub.unsubscribe());
    if (this.otherDecksSub) { this.otherDecksSub(); }
  }

  loadCards() {
    console.log('loding cards');
    const userId = this.userId || this.auth.profileUserId;
    this.groupedCards = this.dataService.cards.filter(c => c.units.some(u => u.ownerId === userId)).map(card => ({ ...card }));
    this.yourUnits = [];
    this.groupedCards.forEach(card => {
      card.units = card.units.filter(u => u.ownerId === userId).map(unit => ({ ...unit }));
      card.units.forEach(unit => this.yourUnits.push(unit));
    });
    // console.log('Your Grouped Cards', this.groupedCards);
    // console.log('Your Units', this.yourUnits);
    this.cardsList.orderList = (list) => list.sort(cardOrderFn);
    this.cardsList.load(this.groupedCards);
    this.unitsList.orderList = (list) => list.sort(unitOrderFn);
    this.unitsList.load(this.yourUnits);
    if (this.hoveringCard) {
      this.hoverCard(this.groupedCards.find(c => c.id === this.hoveringCard?.id));
    }
  }

  async loadAndWatchDecks() {
    if (!this.userId) { // Load your decks
      this.subs.push(this.dataService.yourDecks$.subscribe(decks => {
        this.decks = this.dataService.yourDecks.map(deck => ({ ...deck, units: [...deck.units] }));
        this.decks.sort((a,b) => new Date(a.created) > new Date(b.created) ? 1 : -1);
      }));

    } else { // Load another user's decks
      this.otherDecksSub = onSnapshot(collection(this.firestore, 'users', this.userId, 'decks'), (snapshot: QuerySnapshot) => {
        this.decks = snapshot.docs.map(doc => {
          const deck = { id: doc.id, ...doc.data() } as TDBUserDeck; // Here we only have the units ref
          const units = deck.units.map(ref => {
            const card = this.dataService.cards.find(c => c.id === ref.split('.')[0]);
            const unit = card?.units.find(u => u.ref === ref);
            if (!unit) { console.log(`Error on Deck "${deck.deckName}". Unit ${ref} (${card?.name}) not found`); }
            return unit;
          }).filter(u => !!u) as Array<TFullUnit>;
          return { id: deck.id, deckName: deck.deckName, created: deck.created, units } as TFullDeck;
        });
        this.decks.sort((a,b) => new Date(a.created) > new Date(b.created) ? 1 : -1);
      });
    }
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

  filterList(value: string, field: string) {
    this.cardsList.filter(value);
    this.unitsList.filter(value);
  }



  switchShowDecks() {
    const params = this.userId ? '?userId=' + this.userId : '';
    this.showDecks = !this.showDecks;
    if (!this.showDecks) {
      this.selDeck = undefined;      
      window.history.replaceState(null, 'Your Cards', '/cards' + params);
    } else {
      window.history.replaceState(null, 'Your Decks', '/cards/decks' + params);
    }
  }

  hoverCard(card?: TFullCard, fromDeck = false) {
    if (this.bfDnD.isDragging) { return; }
    this.hoveringCard = card || this.selCard;
    this.hoveringUnit = this.hoveringCard ? null : this.selUnit;
    this.hoverFromDeck = fromDeck;
  }

  hoverUnit(unit?: TFullUnit, fromDeck = false) {
    if (this.bfDnD.isDragging) { return; }
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
    this.moveCardToDeck(card);
  }

  canCardBeAddedToTheDeck(card: TFullCard) { return !!(this.showDecks && this.selDeck && !this.isCardInDeck(card)); }
  canUnitBeAddedToTheDeck(unit: TFullUnit) { return !!(this.showDecks && this.selDeck && !this.isUnitInDeck(unit)); }

  dropIntoDeck(event: any) {
    // console.log('event', event);
    // console.log('bfDnD', this.bfDnD);
    if (!this.selDeck) { return; }

    let newIndex = -1;
    if (event.bfDropPlaceholder.containerId === 'unit-deck') {
      const pos = event.bfDropPlaceholder.id.split('-')[0]; // before / after
      const nextUnit = event.bfDropPlaceholder.model; // The unit it goes after/before
      newIndex = this.selDeck.units.map(u => u.ref).indexOf(nextUnit.ref || '');
      if (pos === 'after') { newIndex += 1; }
    }

    if (this.dragMode === 'add-unit') { this.moveUnitToDeck(event.bfDraggable, newIndex); }
    if (this.dragMode === 'add-card') { this.moveCardToDeck(event.bfDraggable, newIndex); }

    if (this.dragMode === 'order-unit') { // Reorder the card inside the deck
      const currInd = this.selDeck.units.map(u => u.ref).indexOf(event.bfDraggable.ref);
      const unit = this.selDeck.units.splice(currInd, 1); // Remove unit from current position
      if (currInd < newIndex) { newIndex -= 1; } // If it was before the new position, that's now shifted -1
      this.selDeck.units.splice(newIndex, 0, unit[0]); // Add it to the new position
      this.saveDeck();
    }
  }



  moveCardToDeck(card: TFullCard, newIndex = -1) {
    if (this.canCardBeAddedToTheDeck(card)) { // If some units are not in the deck
      const unit = card.units.find(u => !this.selDeck?.units.find(du => du.ref === u.ref)); // Find a unit that is not already in the deck
      if (unit) { this.moveUnitToDeck(unit, newIndex); } // Add it to the deck
    }
  }

  // Add / Remove a unit card to/from the selected deck
  private moveUnitToDeck(unit: TFullUnit, newIndex = -1) {
    if (this.showDecks && this.selDeck) {
      if (!this.isUnitInDeck(unit)) { // Add it to the deck

        if (!unit.card.readyToPlay) {
          return this.growl.error(`Sorry, ${unit.card.name} is still not ready to play :(`);
        }
        if (this.isRestricted && unit.card.maxInDeck && unit.card.maxInDeck <= this.selDeck.units.filter(u => u.cardId === unit.card.id).length) {
          return this.growl.error(`You cannot have more than ${unit.card.maxInDeck} <b>${unit.card.name}</b> in a deck`);
        }
        console.log(`Adding ${unit.card.name} (${unit.ref}) to the deck`);
        // this.growl.success(`1 <b>${unit.card.name}</b> added`);

        if (newIndex === -1) { // Add it as the last card in the deck
          this.selDeck.units.push({ ...unit });
        } else {
          this.selDeck.units.splice(newIndex, 0, { ...unit });
        }
        this.saveDeck();


      } else { // Remove it from the deck
        this.removeUnitFromDeck(unit);
      }
      this.loadGroupDeck();
    }
  }


  removeUnitFromDeck(unit: TFullUnit) {
    if (this.selDeck) {
      const ind = this.selDeck.units.map(c => c.ref).indexOf(unit.ref);
      this.selDeck.units.splice(ind, 1);
      // this.selDeck.units.sort(unitOrderFn);
      const groupedCard = this.deckGroupedCards.find(c => c.id === unit.cardId);
      if (groupedCard) {
        groupedCard.units.splice(groupedCard.units.map(c => c.ref).indexOf(unit.ref), 1);
        if (!groupedCard.units.length) { // If all units are gone
          this.deckGroupedCards.splice(this.deckGroupedCards.indexOf(groupedCard), 1);
        }
      }
      console.log(`Removing ${unit.card.name} (${unit.ref}) from the deck`);
      this.saveDeck();
      // this.growl.error(`1 <b>${unit.card.name}</b> removed`);
    }
  }

  removeCardFromDeck(card: TFullCard) {
    if (this.selDeck && card.units.length) {
      const deckUnits = this.selDeck.units.filter(du => du.cardId === card.id);
      const unitToRemove = deckUnits[deckUnits.length - 1];
      this.removeUnitFromDeck(unitToRemove);
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


  autoOrderDeck() {
    if (!this.selDeck) { return; }
    this.selDeck.units.sort(unitOrderFn);
    this.deckGroupedCards.sort(cardOrderFn);
    this.saveDeck();
  }


  selectDeck(deck: TFullDeck) {
    if (this.deckAction === 'copy')     { this.copyDeck(deck); }
    else if (this.deckAction === 'del') { this.deleteDeck(deck); }
    else { this.editDeck(deck); }
  }

  selectDeckTip() {
    if (this.deckAction === 'copy') { return 'Make a copy of this deck'; }
    if (this.deckAction === 'del')  { return 'Delete this deck'; }
    return 'Edit Deck';
  }

  deckTotals() {
    let deckStats = '';
    if (this.selDeck) {
      const total = this.selDeck.units.length;
      const lands = this.selDeck.units.filter(c => c.card.type === 'land').length;
      const islands   = this.selDeck.units.filter(c => c.card.id === 'c000001').length;
      const plains    = this.selDeck.units.filter(c => c.card.id === 'c000002').length;
      const swamps    = this.selDeck.units.filter(c => c.card.id === 'c000003').length;
      const mountains = this.selDeck.units.filter(c => c.card.id === 'c000004').length;
      const forests   = this.selDeck.units.filter(c => c.card.id === 'c000005').length;
      let landInfo = '';
      if (islands > 0)   { landInfo += (landInfo ? ' + ' : '') + islands   + ' islands';   }
      if (plains > 0)    { landInfo += (landInfo ? ' + ' : '') + plains    + ' plains';    }
      if (swamps > 0)    { landInfo += (landInfo ? ' + ' : '') + swamps    + ' swamps';    }
      if (mountains > 0) { landInfo += (landInfo ? ' + ' : '') + mountains + ' mountains'; }
      if (forests > 0)   { landInfo += (landInfo ? ' + ' : '') + forests   + ' forests';   }
      deckStats = `Total: ${total} cards ----> ${lands} lands ${landInfo ? '(' + landInfo + ')' : ''}`;
    }
    return deckStats;
  }



  goBackToDecks() {
    this.selDeck = undefined; 
    this.loadAndWatchDecks();
    const params = this.userId ? '?userId=' + this.userId : '';
    window.history.pushState(null, 'Your Decks', `/cards/decks` + params);
  }

  createNewDeck() {
    this.deckAction = '';
    this.editDeck({ id: randomUID(), created: getTime(), deckName: 'New Deck', units: [] });
  }

  editDeck(deck: TFullDeck) {
    this.deckAction = '';
    this.selDeck = deck;
    this.deckName = deck.deckName;
    this.loadGroupDeck();
    const params = this.userId ? '?userId=' + this.userId : '';
    window.history.pushState(null, 'Your Deck', `/cards/decks/${deck.id}` + params);
  }

  copyDeck(deck: TFullDeck) {
    this.deckAction = '';
    const deckName = `Copy of ${deck.deckName}`;
    const newDeck = { id: randomUID(), deckName, created: getTime(), units: [...deck.units] }
    this.editDeck(newDeck);    
    this.saveDeck();
    this.growl.success(`A new deck has been created, as copy of ${deck.deckName}`);
  }




  deleteDeck(deck: TFullDeck) {    
    this.deckAction = '';
    this.confirm.open({
      title            : 'Delete Deck',
      htmlContent      : `Are you sure you want to delete your deck <b>${deck.deckName}</b>?`,
      yesButtonText    : 'Yes, delete it',
    }).then(res => { if (res === 'yes' && this.auth.profileUserId) {
      const userId = this.userId || this.auth.profileUserId;
      deleteDoc(doc(this.firestore, 'users', userId, 'decks', deck.id)).then(() => {
        this.growl.success(`Deck ${deck.deckName} deleted`);
        if (this.selDeck) { this.goBackToDecks(); }
        else { this.loadAndWatchDecks(); }
      });
    }});
  }

  async saveDeck() {
    if (this.selDeck && this.auth.profileUserId) {
      this.isSaving = true;
      this.selDeck.deckName = this.deckName;
      const dbDeck = {
        id       : this.selDeck.id,
        created  : this.selDeck.created || getTime(),
        deckName : this.selDeck.deckName,
        units    : this.selDeck.units.map(card => card.ref),
      }
      console.log('Saving DECK', dbDeck);
      const userId = this.userId || this.auth.profileUserId;
      await setDoc(doc(this.firestore, 'users', userId, 'decks', dbDeck.id), dbDeck);
      this.isSaving = false;
      // this.growl.success(`Deck saved`);
    }
  }


  async askSellUnit(unit: TFullUnit) {
    const modalRef = this.ngbModal.open(SellOfferModalComponent, { backdrop: 'static', centered: false, size: 'md' });
    modalRef.componentInstance.unit = unit;
  }


}


// TODO: Edit unit details

// OK TODO: Delete deck (in deck editor)
// OK TODO: Copy deck (in deck editor)
// OK Show when deck is properly saved (or saving)
// OK TODO: Delete deck
// OK TODO: Copy deck
// OK TODO: Autosave
// OK TODO: Break color+type filter for your cards