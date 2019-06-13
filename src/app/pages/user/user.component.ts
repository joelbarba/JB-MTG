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
  isSelected: boolean;
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
  public cardsList: ListHandler;
  public filters = { searchText: '', deckId: '', colorCode: '', cardType: '' };

  public selUser: User;
  public selDeck: UserDeck; // Selected deck on the list of decks

  constructor(
    private afs: AngularFirestore,
    private modal: NgbModal,
    private globals: Globals,
    private profile: Profile,
  ) {
    const listConfig = { rowsPerPage: 20, orderFields: ['orderId'], filterFields: ['name'] };
    this.cardsList  = new ListHandler({ ...listConfig, listName: 'userCardsList' });
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
    });
    // this.userCards$ = this.profileUser$.pipe(
    //   RxOp.map(usr => {
    //     return usr.cards.map(usrCard => {
    //       return {
    //         ...usrCard,
    //         card: this.globals.getCardById(usrCard.id),
    //         isSelected: (deck: UserDeck) => {
    //           if (!deck) { return false; }
    //           return !!deck.cards.filter(c => c.ref === usrCard.ref).length;
    //         }
    //       };
    //     });
    //   })
    // );
    // this.cardsList.connectObs(this.userCards$);

    // this.decksCollection = this.userDoc.collection<UserDeck>('decks');
    // this.userDecks$ = this.decksCollection.snapshotChanges().pipe(
    //   RxOp.map(actions => {
    //     return actions.map(deck => {
    //       const data = deck.payload.doc.data() as UserDeck;
    //       const id = deck.payload.doc.id;
    //       return { ...data, id };
    //     });
    //   })
    // );


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

  public selectDeck = (deck: UserDeck) => {
    this.filters.deckId = deck.id;
    this.selDeck = deck;
    this.selUser.cards.forEach((card: UserCardExt) => {
      card.isSelected = !!this.selDeck.cards.getByProp('ref', card.ref);
    });
  }

  public selectCard = (userCard: UserCardExt) => {
    console.log(userCard);
    if (!!this.selDeck) {
      if (userCard.isSelected) {
        this.selDeck.cards.removeByProp('ref', userCard.ref);
        userCard.isSelected = false;
      } else {
        this.selDeck.cards.push({
          id: userCard.id,
          ref: userCard.ref
        });
        userCard.isSelected = true;
      }
    }
  }

  public openAddDeck = () => {
    const modalRef = this.modal.open(AddDeckModalComponent, { size: 'lg' });
    modalRef.componentInstance.decksCollection = this.decksCollection;
    modalRef.result.then((newCard) => {
      // console.log('new card', newCard);
    });
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
    // this.newCard = { name: 'Howling Mine', type: 'artifact', image: 'howling mine.jpg', color: 'none',  text: '' };
    // this.newCard.id = 'c' + (this.lastId + 1);
    // this.newCard = { color: 'none',  text: '' };
    // this.newCard.cast = [0, 0, 0, 0, 0, 0];
    // this.newCard.power = 5;
    // this.newCard.defence = 2;
  }

  public createDeck = () => {
    // this.cardDoc.update(this.editCard);
    // const cardId = this.newCard.id;
    // delete this.newCard.id;
    this.decksCollection.add(this.newDeck);
    this.growl.success(`New deck successfully created`);
    // this.activeModal.close(this.newCard);
  }
}

