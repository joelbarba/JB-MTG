import { Component, OnInit } from '@angular/core';
import { Observable } from 'rxjs';
import { AngularFirestore, AngularFirestoreCollection, AngularFirestoreDocument } from '@angular/fire/firestore';
import * as RxOp from 'rxjs/operators';
import { NgbModal, NgbActiveModal, ModalDismissReasons } from '@ng-bootstrap/ng-bootstrap';
import { NgForm } from '@angular/forms';
import { BfGrowlService, BfConfirmService } from 'bf-ui-lib';
import { Globals } from 'src/app/globals/globals.service';
import { ListHandler } from 'src/app/globals/listHandler';

export interface User {
  username: string;
  email: string;
  full_name: string;
  cards: Array<UserCard>;
}
export interface UserCard {
  card: string;
  unit: string;
}
export interface Card {
  id?: string;
  orderId?: string;
  units: Array<string>;
  name: string;
  type: string;
  color: string;
  text: string;
  image: string;
  cast: Array<number>;
  power: number;
  defence: number;
}

@Component({
  selector: 'app-user',
  templateUrl: './user.component.html',
  styleUrls: ['./user.component.scss']
})
export class UserComponent implements OnInit {
  public userDoc: AngularFirestoreDocument<User>;
  public profileUser$: Observable<User>;
  public userCards$: Observable<UserCard[]>;
  // public cardsCollection: AngularFirestoreCollection<Card>;
  // public selected: Card;
  // public lastCardId = 1;

  constructor(
    private afs: AngularFirestore,
    private modal: NgbModal,
    private globals: Globals,
  ) { }

  ngOnInit() {

    this.userDoc = this.afs.doc<User>('/users/qINbUCQ3s1GdAzPzaIBH');
    this.profileUser$ = this.userDoc.valueChanges();
    this.userCards$ = this.profileUser$.pipe(
      RxOp.map(usr => {
        return usr.cards.map(c => {
          return {
            ...c,
            ref$ : this.afs.doc<Card>('cards/' + c.card).valueChanges()
          };
        });
      })
    );



    // this.cardsCollection = afs.collection('cards');
    // this.cards$ = afs.collection('cards').valueChanges();

    // this.cards$ = this.cardsCollection.snapshotChanges().pipe(
    //   RxOp.map(actions => {
    //     return actions.map(a => {
    //       const data = a.payload.doc.data() as Card;
    //       const id = a.payload.doc.id;

    //       // Find the highest ID (c9999)
    //       const numId = Number.parseInt(id.slice(1));
    //       data.orderId = ('00000' + numId).slice(-5).toString();

    //       if (numId > this.lastCardId) { this.lastCardId  = numId; }

    //       return { id, ...data };
    //     });
    //   })
    // );


    // const listConfig = { rowsPerPage: 20, orderFields: ['orderId'], filterFields: ['name'] };
    // this.cardsList  = new ListHandler({ ...listConfig, listName: 'cardsList' });

    // this.cardsList.filterList = (list: Array<any>, filterText: string = '', filterFields: Array<string>): Array<any> => {
    //   let filteredList = this.cardsList.defaultFilterList(list, this.filters.searchText, filterFields);
    //   return filteredList.filter(item => {
    //     let match = (!this.filters.colorCode || (this.filters.colorCode === item.color));
    //     match = match && (!this.filters.cardType || (this.filters.cardType === item.type));
    //     return match;
    //   });
    // };

    // this.cardsList.connectObs(this.cards$);

  }

}
