import { Injectable } from '@angular/core';
import { AngularFirestore, AngularFirestoreCollection, AngularFirestoreDocument } from '@angular/fire/firestore';
import {ICard} from '../../typings';
import {BehaviorSubject, Observable} from 'rxjs';
import {Profile} from './profile.service';



@Injectable({ providedIn: 'root' })
export class StoreService {
  public cards = [];
  public cards$ = new BehaviorSubject([]);

  constructor(private afs: AngularFirestore, private profile: Profile) {
    profile.loadPromise.then(() => {
      const cardsCollection = this.afs.collection('cards');
      const cardsCollection$ = cardsCollection.valueChanges({ idField: 'id' }) as Observable<ICard[]>;

      cardsCollection$.subscribe(cards => {
        this.cards = cards;
        this.cards$.next(cards);
      });
    });
  }


}
