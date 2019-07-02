import { Card, User, UserCard, UserDeck } from 'src/typings';
import './prototypes';
import { Injectable } from '@angular/core';
import { AngularFirestore, AngularFirestoreCollection, AngularFirestoreDocument } from '@angular/fire/firestore';
import { Observable } from 'rxjs';
import { Globals } from './globals.service';
import * as RxOp from 'rxjs/operators';


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
    private globals: Globals,
  ) {

    this.userId = 'qINbUCQ3s1GdAzPzaIBH'; // Joel
    // this.userId = 'DygcQXEd6YCL0ICiESEq'; // Alice
    this.userDoc = this.afs.doc<User>('/users/' + this.userId);

    const subs = this.userDoc.snapshotChanges().subscribe(state => {
      const data = state.payload.data();
      this.user = data;
    });

    this.user$ = this.userDoc.valueChanges();
    this.userCards$ = this.user$.pipe(
      RxOp.map(usr => {
        return usr.cards.map(usrCard => {
          return {
            ...usrCard,
            card: this.globals.getCardById(usrCard.id)
            // ref$ : this.afs.doc<Card>('cards/' + card.card).valueChanges()
          };
        });
      })
    );
  }

  addUnitCard = (cardId: string, cardRef: string) => {
    this.user.cards.push({ id: cardId, ref: cardRef });
    this.userDoc.update(this.user);
  }

}
