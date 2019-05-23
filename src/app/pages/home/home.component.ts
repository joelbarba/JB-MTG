import { Component, OnInit } from '@angular/core';
import { Observable } from 'rxjs';
import { AngularFirestore, AngularFirestoreCollection } from '@angular/fire/firestore';
import * as RxOp from 'rxjs/operators';

export interface Card {
  id?: string;
  name: string;
  type: string;
  text: string;
  image: string;
}

@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss']
})
export class HomeComponent {

  cards$: Observable<any[]>;
  cardsCollection: AngularFirestoreCollection<Card>;

  constructor(afs: AngularFirestore) {

    this.cardsCollection = afs.collection('cards');
    // this.cards$ = afs.collection('cards').valueChanges();

    this.cards$ = this.cardsCollection.snapshotChanges().pipe(
      RxOp.map(actions => actions.map(a => {
        const data = a.payload.doc.data() as Card;
        const id = a.payload.doc.id;
        return { id, ...data };
      }))
    );

  }

  public initDB = () => {
    this.cardsCollection.doc('1').set({ name: 'Island',   type: 'land', image: 'island.jpg',   text: 'Add one blue mana to your mana pool'});
    this.cardsCollection.doc('2').set({ name: 'Plains',   type: 'land', image: 'plains.jpg',   text: 'Add one white mana to your mana pool'});
    this.cardsCollection.doc('3').set({ name: 'Swamp',    type: 'land', image: 'swamp.jpg',    text: 'Add one black mana to your mana pool'});
    this.cardsCollection.doc('4').set({ name: 'Mountain', type: 'land', image: 'mountain.jpg', text: 'Add one red mana to your mana pool'});
  }
}

