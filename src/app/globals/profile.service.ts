import { Injectable } from '@angular/core';
import './prototypes';
import { AngularFirestore, AngularFirestoreCollection, AngularFirestoreDocument } from '@angular/fire/firestore';
import { Observable } from 'rxjs';
import * as RxOp from 'rxjs/operators';

export interface User {
  username: string;
  email: string;
  name: string;
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


@Injectable({
 providedIn: 'root'
})
export class Profile {
  public userDoc: AngularFirestoreDocument<User>;
  public user$: Observable<User>;
  public userCards$: Observable<UserCard[]>;

  public userId: string;
  public user: User;

  constructor(
    private afs: AngularFirestore,
  ) {

    this.userId = 'qINbUCQ3s1GdAzPzaIBH';
    this.userDoc = this.afs.doc<User>('/users/' + this.userId);

    const subs = this.userDoc.snapshotChanges().subscribe(state => {
      const data = state.payload.data();
      this.user = data;
    });

    this.user$ = this.userDoc.valueChanges();
    this.userCards$ = this.user$.pipe(
      RxOp.map(usr => {
        return usr.cards.map(card => {
          return {
            ...card,
            ref$ : this.afs.doc<Card>('cards/' + card.card).valueChanges()
          };
        });
      })
    );
  }

  addUnitCard = (cardId: string, cardRef: string) => {
    this.user.cards.push({ card: cardId, unit: cardRef });
    this.userDoc.update(this.user);

  }

}
