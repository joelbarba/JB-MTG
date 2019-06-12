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


@Component({
  selector: 'app-user',
  templateUrl: './user.component.html',
  styleUrls: ['./user.component.scss']
})
export class UserComponent implements OnInit {
  public userDoc: AngularFirestoreDocument<User>;
  public decksCollection: AngularFirestoreCollection<UserDeck>;

  public profileUser$: Observable<User>;
  public userCards$: Observable<UserCard[]>;
  public userDecks$: Observable<UserDeck[]>;

  public cardsList: ListHandler;
  public filters = { searchText: '', collection: null, colorCode: '', cardType: '' };

  constructor(
    private afs: AngularFirestore,
    private modal: NgbModal,
    private globals: Globals,
    private profile: Profile,
  ) { }

  async ngOnInit() {
    const listConfig = { rowsPerPage: 20, orderFields: ['orderId'], filterFields: ['name'] };
    this.cardsList  = new ListHandler({ ...listConfig, listName: 'userCardsList' });

    // Wait until all cards are loaded
    await this.globals.cardsPromise;

    this.userDoc = this.afs.doc<User>('/users/qINbUCQ3s1GdAzPzaIBH');
    this.profileUser$ = this.userDoc.valueChanges();
    this.userCards$ = this.profileUser$.pipe(
      RxOp.map(usr => {
        return usr.cards.map(c => {
          return {
            ...c,
            cardObj: this.globals.getCardById(c.card),
            ref$ : this.afs.doc<Card>('cards/' + c.card).valueChanges()
          };
        });
      })
    );
    this.cardsList.connectObs(this.userCards$);

    this.decksCollection = this.userDoc.collection<UserDeck>('decks');
    this.userDecks$ = this.decksCollection.valueChanges();


    this.cardsList.filterList = (list: Array<any>, filterText: string = '', filterFields: Array<string>): Array<any> => {
      const filteredList = this.cardsList.defaultFilterList(list, this.filters.searchText, filterFields);
      return filteredList.filter(item => {
        let match = (!this.filters.colorCode || (this.filters.colorCode === item.cardObj.color));
        match = match && (!this.filters.cardType || (this.filters.cardType === item.cardObj.type));
        return match;
      });
    };
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

