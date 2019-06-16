import { Card, User, UserCard, UserDeck } from 'src/typings';
import { Component, OnInit } from '@angular/core';
import { Observable } from 'rxjs';
import { AngularFirestore, AngularFirestoreCollection, AngularFirestoreDocument } from '@angular/fire/firestore';
import * as RxOp from 'rxjs/operators';
import { NgbModal, NgbActiveModal, ModalDismissReasons } from '@ng-bootstrap/ng-bootstrap';
import { NgForm } from '@angular/forms';
import { BfGrowlService, BfConfirmService } from 'bf-ui-lib';
import { Globals } from 'src/app/globals/globals.service';
import { ListHandler } from 'src/app/globals/listHandler';
import { Profile } from 'src/app/globals/profile.service';


interface UserCardExt extends UserCard {
  isSelected?: boolean;
  from ?: 'all' | 'deck';
}

@Component({
  selector: 'app-user',
  templateUrl: './user.component.html',
  styleUrls: ['./user.component.scss']
})
export class UserComponent implements OnInit {
  public userDoc: AngularFirestoreDocument<User>;
  public decksCollection: AngularFirestoreCollection<UserDeck>;

  public profileUser$: Observable<User>;
  public userCards$: Observable<UserCardExt[]>;
  public userDecks$: Observable<UserDeck[]>;

  public pageMode = 0; // 0=view, 1=deck edit

  public cardsList: ListHandler;  // all cards
  public deckCards: ListHandler;  // selected deck cards
  public filters = { searchText: '', deckId: '', colorCode: '', cardType: '' };

  public selUser: User;         // User
  public selDeck: UserDeck;     // Selected deck on the list of decks
  public viewCard: UserCardExt; // Selected card to display on the big panel

  constructor(
    private afs: AngularFirestore,
    private modal: NgbModal,
    private globals: Globals,
    private growl: BfGrowlService,
    private profile: Profile,
  ) {
    const listConfig = { rowsPerPage: 20, orderFields: ['orderId'], filterFields: ['name'] };
    this.cardsList  = new ListHandler({ ...listConfig, listName: 'userCardsList' });
    this.deckCards  = new ListHandler({ ...listConfig, listName: 'deckCardsList' });
  }

  async ngOnInit() {
    await this.globals.cardsPromise;  // Wait until all cards are loaded

    this.userDoc = this.afs.doc<User>('/users/qINbUCQ3s1GdAzPzaIBH');
    this.decksCollection = this.userDoc.collection<UserDeck>('decks');

    this.profileUser$ = this.userDoc.valueChanges();

    // One time subscription
    const usrSub = this.profileUser$.subscribe((user: User) => {
      usrSub.unsubscribe();

      this.selUser = user;
      this.selUser.cards = user.cards.map((usrCard: UserCard) => {
        usrCard.card = this.globals.getCardById(usrCard.id);
        return usrCard;
      });
      this.selUser.decks = [];

      // Fetch user decks
      this.userDecks$ = this.decksCollection.snapshotChanges().pipe(
        RxOp.map(actions => {
          return actions.map(deck => {
            const data = deck.payload.doc.data() as UserDeck;
            const id = deck.payload.doc.id;
            return { ...data, id };
          });
        })
      );
      const deckSubs = this.userDecks$.subscribe((decks: UserDeck[]) => {
        deckSubs.unsubscribe();
        this.selUser.decks = decks.map((deck: UserDeck) => {
          return { ...deck, isSelected: false };
        });
      });

      this.cardsList.load(this.selUser.cards);
      this.deckCards.load(this.selUser.cards);
      this.selectCard(this.selUser.cards[0]);
    });

    this.cardsList.filterList = (list: Array<any>, filterText: string = '', filterFields: Array<string>): Array<any> => {
      const filteredList = this.cardsList.defaultFilterList(list, this.filters.searchText, filterFields);
      return filteredList.filter(item => {
        let match = (!this.filters.colorCode || (this.filters.colorCode === item.card.color));
        match = match && (!this.filters.cardType || (this.filters.cardType === item.card.type));

        // Check if the card is in the deck
        const deck = this.selUser.decks.getById(this.filters.deckId);
        if (!!deck) {
          match = match && !!deck.cards.filter((c: UserCard) => c.ref === item.ref).length;
        }

        return match;
      });
    };
  }

  public changePageMode = (newMode?: number) => {
    if (newMode === 0 || newMode === 1) {
      this.pageMode = newMode;
    } else {
      this.pageMode = !this.pageMode ? 1 : 0;
    }

    if (this.pageMode === 0) {
      this.selectDeck(this.selUser.decks.getById(this.selDeck.id));
    }
  }

  public selectDeck = (deck: UserDeck) => {
    if (!deck) { // Unselect deck
      this.selUser.cards.forEach((card: UserCardExt) => card.isSelected = false);
      this.selDeck = null;

    } else { // Select deck
      this.selDeck = <UserDeck> deck.copy();

      // Load the list of the cards of the selected deck
      this.reloadDeckList();
    }
  }

  public selectCard = (userCard: UserCardExt, list?: 'all' | 'deck') => {
    console.log(userCard);
    this.viewCard = userCard;
    this.viewCard.from = list || 'all';

    if (this.pageMode === 1 && list === 'all') {
      if (userCard.isSelected) { // Unselect
        this.selDeck.cards.removeByProp('ref', userCard.ref);
        userCard.isSelected = false;

      } else {  // Select (add to deck)
        this.selDeck.cards.push({
          id: userCard.id,
          ref: userCard.ref
        });
        userCard.isSelected = true;
      }

      this.reloadDeckList();
    }
  }

  // Reload the list of cards of the deck
  public reloadDeckList = () => {
    this.deckCards.load(this.selDeck.cards.map((userCard: UserCard) => {
      return { ...userCard, card: this.globals.getCardById(userCard.id) };
    }));

    // Select the cards of the deck on the main list
    this.selUser.cards.forEach((card: UserCardExt) => {
      card.isSelected = !!this.selDeck.cards.getByProp('ref', card.ref);
    });
  }

  public openAddDeck = () => {
    const modalRef = this.modal.open(AddDeckModalComponent, { size: 'lg' });
    modalRef.componentInstance.decksCollection = this.decksCollection;
    modalRef.result.then((newDeck: UserDeck) => {
      this.selUser.decks.push(newDeck);
      this.selectDeck(newDeck); // Select the new deck
      this.changePageMode(1); // Change to edit mode auto
    });
  }

  public openEditDeck = () => {
    const modalRef = this.modal.open(EditDeckModalComponent, { size: 'lg' });
    modalRef.componentInstance.selDeck = this.selDeck;
    modalRef.componentInstance.decksCollection = this.decksCollection;
    modalRef.result.then((updatedDeck) => {
      if (!!updatedDeck) {
        this.selDeck = { ...this.selDeck, ...updatedDeck };
        this.reloadDeckList();

      } else {
        // Deck was deleted
        this.selUser.decks.removeById(this.selDeck.id);
        this.selectDeck(null); // Unselect the new deck
        this.changePageMode(0); // Change to view mode
      }
    });
  }

  // Save selected (in editing mode) deck
  public saveDeck = () => {
    if (!!this.selDeck) {
      this.decksCollection.doc(this.selDeck.id).set(this.selDeck);

      // Update the user object in memory
      let userDeck = this.selUser.decks.getById(this.selDeck.id);
      userDeck.cards = this.selDeck.cards.map(c => ({ id: c.id, ref: c.ref }));
      userDeck.name = this.selDeck.name;
      userDeck.description = this.selDeck.description;

      this.growl.success(`Deck ${this.selDeck.name} updated successfully`);
      this.changePageMode(0);
    }
  }

}




// -----------------------------------------------------------------------------------
@Component({
  selector: 'add-deck-modal',
  templateUrl: 'add-deck.modal.html'
})
export class AddDeckModalComponent implements OnInit {
  public newDeck: UserDeck = { name: '', description: '', cards: [] };    // Working object
  public decksCollection: AngularFirestoreCollection<UserDeck>;

  constructor(
    private afs: AngularFirestore,
    public activeModal: NgbActiveModal,
    private growl: BfGrowlService,
    private modal: NgbModal,
    private globals: Globals,
    private profile: Profile,
  ) { }

  ngOnInit() {
  }

  public createDeck = () => {
    this.decksCollection.add(this.newDeck);
    this.growl.success(`New deck successfully created`);
    this.activeModal.close(this.newDeck);
  }
}



// -----------------------------------------------------------------------------------
@Component({
  selector: 'edit-deck-modal',
  templateUrl: 'edit-deck.modal.html'
})
export class EditDeckModalComponent implements OnInit {
  public selDeck: UserDeck; // Reference
  public deck: UserDeck;    // Working object
  public decksCollection: AngularFirestoreCollection<UserDeck>;

  constructor(
    private afs: AngularFirestore,
    public activeModal: NgbActiveModal,
    private growl: BfGrowlService,
    private modal: NgbModal,
    private globals: Globals,
    private profile: Profile,
    private confirm: BfConfirmService,
  ) { }

  ngOnInit() {
    this.deck = <UserDeck> this.selDeck.copy();
  }

  public clearDeck = () => {
    this.deck.cards = [];
    this.growl.success(`All cards removed from deck ${this.selDeck.name}`);
  }

  public deleteDeck = () => {
    this.confirm.open({
        text             : `Are you sure you want to delete deck ${this.selDeck.name}?`,
        yesButtonText    : 'Yes, delete it',
    }).then((res) => {
      if (res === 'yes') {
        this.decksCollection.doc(this.selDeck.id).delete();
        this.growl.success(`Deck ${this.selDeck.name} deleted`);
        this.activeModal.close(null);
      }
    }, (res) => {});
  }

  public updateDeck = () => {
    // this.cardDoc.update(this.editCard);
    // const cardId = this.newCard.id;
    // delete this.newCard.id;
    // this.decksCollection.add(this.newDeck);
    // this.growl.success(`Deck ${this.selDeck.name} successfully updated`);
    this.activeModal.close(this.deck);
  }
}

