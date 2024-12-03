import { Component, HostListener, ViewEncapsulation } from '@angular/core';
import { AuthService } from '../../core/common/auth.service';
import { ShellService } from '../../shell/shell.service';
import { CommonModule } from '@angular/common';
import { Firestore, QuerySnapshot, QueryDocumentSnapshot, DocumentData, setDoc, updateDoc, deleteDoc } from '@angular/fire/firestore';
import { getDocs, getDoc, collection, doc } from '@angular/fire/firestore';
import { Observable } from 'rxjs';
import { collectionData } from 'rxfire/firestore';
import { TCard, TDeckRef, TUnitCard, TUser } from '../../core/types';
import { FormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { BfConfirmService, BfGrowlService, BfListHandler, BfUiLibModule } from '@blueface_npm/bf-ui-lib';
import { MtgCardComponent } from '../../core/common/internal-lib/mtg-card/mtg-card.component';
import { cardOrderList, cardTypes, colors, randomUnitId } from '../../core/common/commons';
import { HoverTipDirective } from '../../core/common/internal-lib/bf-tooltip/bf-tooltip.directive';

type TDeckEdit = { id: string, deckName: string, cards: Array<TUnitCard> };

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
  groupedCards: Array<TCard> = [];
  yourCards: Array<TUnitCard> = [];
  
  hoveringCard: TCard | null = null;
  hoveringUnit: TUnitCard | null = null;
  selCard: TCard | null = null;
  selUnit: TUnitCard | null = null;

  isGrouped = true;
  isDeckGrouped = true;

  colors = colors;
  cardTypes = cardTypes;

  showDecks = true;


  decks: Array<TDeckEdit> = [];
  selDeck?: TDeckEdit;
  deckName = '';
  groupDeckCards: Array<TCard> = [];



  constructor(
    private shell: ShellService,
    private auth: AuthService,
    private firestore: Firestore,
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
    this.cardsList.orderList = cardOrderList;
  }

  async ngOnInit() {
    await this.auth.profilePromise;
    await this.loadCards();
    await this.loadDecks();
    // this.selectCard(this.yourCards[0]);
    this.selectCard(this.groupedCards[0]);
    this.editDeck(this.decks[0]);
  }

  async loadCards() {
    const snapshot: QuerySnapshot<DocumentData> = await getDocs(collection(this.firestore, 'cards'));
    const allCards = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as TCard));
    this.groupedCards = allCards.filter(c => c.units.some(u => u.owner === this.auth.profileUserId));
    console.log(this.groupedCards);
    this.yourCards = [];
    this.groupedCards.forEach(card => {
      const cardWithoutUnits = card.keyFilter((v,k) => k !== 'units') as Omit<TCard, 'units'>;
      card.units.filter(u => u.owner === this.auth.profileUserId).forEach(unit => {
        this.yourCards.push({ ...cardWithoutUnits, ref: unit.ref });
      });
    });
    this.switchGrouped();
  }


  switchGrouped() {
    if (this.isGrouped) {
      this.cardsList.load(this.groupedCards);
    } else {
      this.cardsList.load(this.yourCards);
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
    if (!this.showDecks) { this.selDeck = undefined; }
  }

  hoverCard(card?: TCard) {
    this.hoveringCard = card || this.selCard;
    this.hoveringUnit = this.hoveringCard ? null : this.selUnit;
  }

  hoverUnit(unit?: TUnitCard) {
    this.hoveringUnit = unit || this.selUnit;
    this.hoveringCard = this.hoveringUnit ? null : this.selCard;
  }

  unitsInDeck(cardId: string): number {
    if (!this.selDeck || !this.showDecks) { return 0; }
    return this.selDeck.cards.filter(c => c.id === cardId).length;
  }

  isCardInDeck(card: TCard): boolean {
    if (!this.selDeck || !this.showDecks) { return false; }
    return !!card.units.every(u => this.selDeck?.cards.find(c => c.ref === u.ref));
  }

  isUnitInDeck(card: TUnitCard): boolean {
    if (!this.selDeck || !this.showDecks) { return false; }
    return !!this.selDeck?.cards.find(c => c.ref === card.ref);
  }

  selectUnit(unit: TUnitCard) {
    this.selUnit = unit;
    this.selCard = null;
    this.hoverUnit(unit);
    this.moveUnitToDeck(unit);
  }

  selectCard(card: TCard) {
    this.selCard = card;
    this.selUnit = null;
    this.hoverCard(card);
    if (this.showDecks && this.selDeck) {
      if (!this.isCardInDeck(card)) { // If not all units are in the deck

        // Find a unit of the card that is not already in the deck
        const unitRef = card.units.find(u => !this.selDeck?.cards.find(c => c.ref === u.ref));
        if (unitRef) { this.moveUnitToDeck(this.turnCardToUnit(card, unitRef.ref)); } // Add it to the deck
      }
    }
  }

  // Add / Remove a unit card to/from the selected deck
  private moveUnitToDeck(unit: TUnitCard) {
    if (this.showDecks && this.selDeck) {
      if (!this.isUnitInDeck(unit)) { // Add it to the deck

        if (!unit.readyToPlay) {
          return this.growl.error(`Sorry, ${unit.name} is still not ready to play :(`);
        }
        if (unit.maxInDeck && unit.maxInDeck <= this.selDeck.cards.filter(c => c.id === unit.id).length) {
          return this.growl.error(`You cannot have more than ${unit.maxInDeck} ${unit.name} in a deck`);
        }
        console.log(`Adding ${unit.name} (${unit.ref}) to the deck`);
        this.growl.success(`${unit.name} added to the deck`);
        this.selDeck.cards.push({ ...unit });
        this.selDeck.cards = cardOrderList(this.selDeck.cards);


      } else { // Remove it from the deck
        this.removeUnitFromDeck(unit);
      }
      this.loadGroupDeck();
    }
  }

  private turnCardToUnit(card: TCard, ref: string): TUnitCard {
    const cardWithoutUnits = card.keyFilter((v,k) => k !== 'units') as Omit<TCard, 'units'>;
    return { ...cardWithoutUnits, ref };
  }



  @HostListener('window:keyup', ['$event'])
  keyEvent(ev: KeyboardEvent) {
    const CARDS_PER_ROW = 7; // TODO: Calculate that dynamically
    // console.log(ev.code);
    if (ev.code === 'ArrowLeft' || ev.code === 'ArrowRight' || ev.code === 'ArrowDown' || ev.code === 'ArrowUp') {
      const list = this.cardsList.loadedList;
      if (this.isGrouped) {
        const ind = list.indexOf(list.find(c => c.id === this.selCard?.id)) || 0;
        if (ev.code === 'ArrowLeft')  { this.selCard = list[Math.max(ind - 1, 0)]; }
        if (ev.code === 'ArrowRight') { this.selCard = list[Math.min(ind + 1, list.length - 1)]; }
        if (ev.code === 'ArrowDown')  { this.selCard = list[Math.min(ind + CARDS_PER_ROW, list.length - 1)]; }
        if (ev.code === 'ArrowUp')    { this.selCard = list[Math.max(ind - CARDS_PER_ROW, 0)]; }
        if (this.selCard) { this.hoverCard(this.selCard); this.selUnit = null; }
      }
      else {
        const ind = list.indexOf(list.find(c => c.ref === this.selUnit?.ref)) || 0;
        if (ev.code === 'ArrowLeft')  { this.selUnit = list[Math.max(ind - 1, 0)]; }
        if (ev.code === 'ArrowRight') { this.selUnit = list[Math.min(ind + 1, list.length - 1)]; }
        if (ev.code === 'ArrowDown')  { this.selUnit = list[Math.min(ind + CARDS_PER_ROW, list.length - 1)]; }
        if (ev.code === 'ArrowUp')    { this.selUnit = list[Math.max(ind - CARDS_PER_ROW, 0)]; }
        if (this.selUnit) { this.hoverUnit(this.selUnit); this.selCard = null; }
      }
    }
    if (ev.code === 'Space' || ev.code === 'Enter' || ev.code === 'NumpadEnter') {
      if (this.isGrouped && this.selCard) { this.selectCard(this.selCard); }
      if (!this.isGrouped && this.selUnit) { this.selectUnit(this.selUnit); }
    }
    ev.stopPropagation();
  }




  async loadDecks() {
    if (this.auth.profileUserId) {
      const decksCol = collection(this.firestore, 'users', this.auth.profileUserId, 'decks');
      const snapshot: QuerySnapshot<DocumentData> = await getDocs(decksCol);
      this.decks = snapshot.docs.map(doc => {
        const data = { ...doc.data() } as TDeckRef;
        const cards = data.cards.map(ref => this.yourCards.find(c => c.ref === ref)) as Array<TUnitCard>;
        return { id: doc.id, deckName: data.deckName, cards: cardOrderList(cards) };
      });
    }
  }

  createNewDeck() {
    this.editDeck({ id: randomUnitId(), deckName: 'New Deck', cards:  [] });
  }

  editDeck(deck: TDeckEdit) {
    this.selDeck = deck;
    this.deckName = deck.deckName;
    this.loadGroupDeck();
  }

  private loadGroupDeck() {
    if (this.selDeck) {
      this.groupDeckCards = [];
      this.selDeck.cards.forEach(unit => {
        const unitObj = { ref: unit.ref, owner: this.auth.profileUserId || '' };
        const card = this.groupDeckCards.find(c => c.id === unit.id);
        if (card) { card.units.push(unitObj); }
        else { this.groupDeckCards.push({ ...unit, units: [unitObj] }); }
      });
    }
  }

  removeUnitFromDeck(unit: TUnitCard) {
    if (this.selDeck) {
      console.log(`Removing ${unit.name} (${unit.ref}) from the deck`);
      this.growl.error(`${unit.name} removed from the deck`);
      const ind = this.selDeck.cards.map(c => c.ref).indexOf(unit.ref);
      this.selDeck.cards.splice(ind, 1);
      this.selDeck.cards = cardOrderList(this.selDeck.cards);
      this.loadGroupDeck();
    }
  }

  removeCardFromDeck(card: TCard) {
    if (this.selDeck && card.units.length) {
      const unit = this.turnCardToUnit(card, card.units[card.units.length - 1].ref);
      this.moveUnitToDeck(unit); // Remove it from the deck
    }
  }

  deleteDeck(deck: TDeckEdit) {
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
      const dbDeck = {
        id       : this.selDeck.id,
        deckName : this.selDeck.deckName,
        cards    : this.selDeck.cards.map(card => card.ref)
      }
      console.log('Saving Card', dbDeck);
      await setDoc(doc(this.firestore, 'users', this.auth.profileUserId, 'decks', dbDeck.id), dbDeck);
      this.growl.success(`Deck saved`);
    }
  }

}