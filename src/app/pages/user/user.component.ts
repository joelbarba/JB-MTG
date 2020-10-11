import { ICard, IUser, IUserCard, UserDeck } from 'src/typings';
import { Component, OnInit } from '@angular/core';
import { Observable } from 'rxjs';
import { AngularFirestore, AngularFirestoreCollection, AngularFirestoreDocument } from '@angular/fire/firestore';
import * as RxOp from 'rxjs/operators';
import { NgbModal, NgbActiveModal, ModalDismissReasons } from '@ng-bootstrap/ng-bootstrap';
import {Globals} from '../../core/globals.service';
import {BfConfirmService, BfGrowlService, BfListHandler} from '@blueface_npm/bf-ui-lib';
import {Profile} from '../../core/profile.service';


interface UserCardExt extends IUserCard {
  isSelected?: boolean;
  from ?: 'all' | 'deck';
}
//
// @Component({
//   selector: 'app-user',
//   templateUrl: './user.component.html',
//   styleUrls: ['./user.component.scss']
// })
// export class UserComponent implements OnInit {
//   public userDoc: AngularFirestoreDocument<IUser>;
//   public decksCollection: AngularFirestoreCollection<UserDeck>;
//
//   public userCards$: Observable<UserCardExt[]>;
//   public userDecks$: Observable<UserDeck[]>;
//
//   public pageMode = 0; // 0=view, 1=deck edit
//
//   public cardsList: BfListHandler;  // all cards
//   public deckCards: BfListHandler;  // selected deck cards
//   public filters = { searchText: '', deckId: '', colorCode: '', cardType: '' };
//
//   public selUser: IUser;         // User
//   public selDeck: UserDeck;     // Selected deck on the list of decks
//   public viewCard: UserCardExt; // Selected card to display on the big panel
//
//   constructor(
//     private modal: NgbModal,
//     private afs: AngularFirestore,
//     private growl: BfGrowlService,
//     public globals: Globals,
//     public profile: Profile,
//   ) {
//     const listConfig = { rowsPerPage: 36, orderFields: ['orderId'], filterFields: ['name'] };
//     this.cardsList  = new BfListHandler({ ...listConfig, listName: 'userCardsList' });
//     this.deckCards  = new BfListHandler({ ...listConfig, listName: 'deckCardsList' });
//   }
//
//   async ngOnInit() {
//     await this.profile.loadPromise;
//     await this.globals.cardsPromise;  // Wait until all cards are loaded
//
//     this.userDoc = this.profile.userDoc;
//     this.decksCollection = this.userDoc.collection<UserDeck>('decks');
//
//     // Load the user
//     this.selUser = await this.globals.getUser(this.profile.userId);
//     this.selUser.$cards = this.profile.user.cards.map(this.globals.getCardObjByRef);
//     this.selUser.decks = [];
//
//     // Fetch user decks
//     this.userDecks$ = this.decksCollection.snapshotChanges().pipe(
//       RxOp.map(actions => {
//         return actions.map(deck => {
//           const data = deck.payload.doc.data() as UserDeck;
//           const id = deck.payload.doc.id;
//           return { ...data, id };
//         });
//       })
//     );
//     const deckSubs = this.userDecks$.subscribe((decks: UserDeck[]) => {
//       deckSubs.unsubscribe();
//       this.selUser.decks = decks.map((deck: UserDeck) => {
//         deck.$cards = deck.cards.map(this.globals.getCardObjByRef);
//         return { ...deck, isSelected: false };
//       });
//     });
//
//     this.cardsList.load(this.selUser.$cards);
//     this.deckCards.load(this.selUser.$cards);
//     if (this.selUser.$cards.length) {
//       this.selectCard(this.selUser.$cards[0]);
//     }
//
//     // Define list filter
//     this.cardsList.filterList = (list: Array<any>, filterText: string = '', filterFields: Array<string>): Array<any> => {
//       const filteredList = this.cardsList.defaultFilterList(list, this.filters.searchText, filterFields);
//       return filteredList.filter(item => {
//         let match = (!this.filters.colorCode || (this.filters.colorCode === item.card.color));
//         match = match && (!this.filters.cardType || (this.filters.cardType === item.card.type));
//
//         // Check if the card is in the deck
//         const deck = this.selUser.decks.getById(this.filters.deckId);
//         if (!!deck) {
//           match = match && !!deck.cards.filter(cardRef => cardRef === item.ref).length;
//         }
//
//         return match;
//       });
//     };
//   }
//
//   // newMode --> 0=view, 1=deck edit
//   public changePageMode = (newMode?: number) => {
//     if (newMode === 0 || newMode === 1) {
//       this.pageMode = newMode;
//     } else {
//       this.pageMode = !this.pageMode ? 1 : 0;
//     }
//
//     if (this.pageMode === 0 && !!this.selDeck && !!this.selDeck.id) {
//       this.selectDeck(this.selUser.decks.getById(this.selDeck.id));
//     }
//   }
//
//   public selectDeck = (deck: UserDeck) => {
//     if (!deck) { // Unselect deck
//       this.selUser.$cards.forEach((card: UserCardExt) => card.isSelected = false);
//       this.selDeck = null;
//
//     } else { // Select deck
//       this.selDeck = deck.dCopy() as UserDeck;
//
//       // Load the list of the cards of the selected deck
//       this.reloadDeckList();
//     }
//   }
//
//   public selectCard = (userCard: UserCardExt, list?: 'all' | 'deck') => {
//     console.log(userCard, 'aaa');
//     this.viewCard = userCard;
//     this.viewCard.from = list || 'all';
//
//     if (this.pageMode === 1 && list === 'all') {
//       if (userCard.isSelected) { // Unselect
//         this.selDeck.$cards.removeByProp('ref', userCard.ref);
//         this.selDeck.cards.splice(this.selDeck.cards.indexOf(userCard.ref), 1);
//         userCard.isSelected = false;
//
//       } else {  // Select (add to deck)
//         this.selDeck.cards.push(userCard.ref);
//         const cardId = userCard.ref.split('.')[0];
//         this.selDeck.$cards.push({ card: this.globals.getCardById(cardId), ref: userCard.ref });
//         userCard.isSelected = true;
//       }
//
//       this.reloadDeckList();
//     }
//   }
//
//   // Reload the list of cards of the deck
//   public reloadDeckList = () => {
//     this.deckCards.load(this.selDeck.cards.map(this.globals.getCardObjByRef));
//
//     // Select the cards of the deck on the main list
//     this.selUser.$cards.forEach((card: UserCardExt) => {
//       card.isSelected = !!this.selDeck.$cards.getByProp('ref', card.ref);
//     });
//   }
//
//   public openAddDeck = () => {
//     const modalRef = this.modal.open(AddDeckModalComponent, { size: 'lg' });
//     modalRef.componentInstance.decksCollection = this.decksCollection;
//     modalRef.result.then((newDeck: UserDeck) => {
//       this.selUser.decks.push(newDeck);
//       this.selectDeck(newDeck); // Select the new deck
//       this.changePageMode(1); // Change to edit mode auto
//     });
//   }
//
//   public openEditDeck = () => {
//     const modalRef = this.modal.open(EditDeckModalComponent, { size: 'lg' });
//     modalRef.componentInstance.selDeck = this.selDeck;
//     modalRef.componentInstance.decksCollection = this.decksCollection;
//     modalRef.result.then((updatedDeck) => {
//       if (!!updatedDeck) {
//         if (!!updatedDeck.id) { // Deck updated
//           this.selDeck = { ...this.selDeck, ...updatedDeck };
//           this.reloadDeckList();
//
//         } else { // Deck was deleted
//           this.selUser.decks.removeById(this.selDeck.id);
//           this.selectDeck(null); // Unselect the new deck
//           this.changePageMode(0); // Change to view mode
//         }
//       }
//     });
//   }
//
//   // Save selected (in editing mode) deck
//   public saveDeck = () => {
//     if (!!this.selDeck && !!this.selDeck.id) {
//       const selDeckDB = {
//         name: this.selDeck.name,
//         description: this.selDeck.description,
//         cards: this.selDeck.$cards.map(card => card.ref),
//       };
//       this.decksCollection.doc(this.selDeck.id).set(selDeckDB);
//
//       // Update the user object in memory
//       const userDeck = this.selUser.decks.getById(this.selDeck.id);
//       if (!!userDeck) {  // If deck update
//         userDeck.cards = this.selDeck.cards;
//         userDeck.$cards = this.selDeck.cards.map(this.globals.getCardObjByRef);
//         userDeck.name = this.selDeck.name;
//         userDeck.description = this.selDeck.description;
//       }
//
//       this.growl.success(`Deck ${this.selDeck.name} updated successfully`);
//       this.changePageMode(0);
//       this.reloadDeckList();
//     }
//   }
//
// }
//


//
// // -----------------------------------------------------------------------------------
// @Component({
//   selector: 'add-deck-modal',
//   templateUrl: 'add-deck.modal.html'
// })
// export class AddDeckModalComponent implements OnInit {
//   public newDeck: UserDeck = { name: '', description: '', cards: [] };    // Working object
//   public decksCollection: AngularFirestoreCollection<UserDeck>;
//
//   constructor(
//     private afs: AngularFirestore,
//     public activeModal: NgbActiveModal,
//     private growl: BfGrowlService,
//     private modal: NgbModal,
//     private globals: Globals,
//     private profile: Profile,
//   ) { }
//
//   ngOnInit() {
//   }
//
//   public createDeck = () => {
//     this.decksCollection.add(this.newDeck).then(deck => {
//       this.newDeck.id = deck.id;
//       this.newDeck.$cards = [];
//       this.growl.success(`New deck successfully created`);
//       this.activeModal.close(this.newDeck);
//     });
//   }
// }
//
//
//
// // -----------------------------------------------------------------------------------
// @Component({
//   selector: 'edit-deck-modal',
//   templateUrl: 'edit-deck.modal.html'
// })
// export class EditDeckModalComponent implements OnInit {
//   public selDeck: UserDeck; // Reference
//   public deck: UserDeck;    // Working object
//   public decksCollection: AngularFirestoreCollection<UserDeck>;
//
//   constructor(
//     private afs: AngularFirestore,
//     public activeModal: NgbActiveModal,
//     private growl: BfGrowlService,
//     private modal: NgbModal,
//     private globals: Globals,
//     private profile: Profile,
//     private confirm: BfConfirmService,
//   ) { }
//
//   ngOnInit() {
//     this.deck = this.selDeck.dCopy() as UserDeck;
//   }
//
//   public clearDeck = () => {
//     this.deck.cards = [];
//     this.growl.success(`All cards removed from deck ${this.selDeck.name}`);
//   }
//
//   public deleteDeck = () => {
//     this.confirm.open({
//         text             : `Are you sure you want to delete deck ${this.selDeck.name}?`,
//         yesButtonText    : 'Yes, delete it',
//     }).then((res) => {
//       if (res === 'yes') {
//         this.decksCollection.doc(this.selDeck.id).delete();
//         this.growl.success(`Deck ${this.selDeck.name} deleted`);
//         this.activeModal.close({});
//       }
//     }, (res) => {});
//   }
//
//   public updateDeck = () => {
//     // this.cardDoc.update(this.editCard);
//     // const cardId = this.newCard.id;
//     // delete this.newCard.id;
//     // this.decksCollection.add(this.newDeck);
//     // this.growl.success(`Deck ${this.selDeck.name} successfully updated`);
//     this.activeModal.close(this.deck);
//   }
// }
//
