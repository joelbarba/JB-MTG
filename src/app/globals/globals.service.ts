import { Card, User, UserCard, UserDeck } from 'src/typings';
import './prototypes';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { AngularFirestore, AngularFirestoreCollection, AngularFirestoreDocument } from '@angular/fire/firestore';
import * as RxOp from 'rxjs/operators';


@Injectable({
 providedIn: 'root'
})
export class Globals {
  public cardsCollection: AngularFirestoreCollection<Card>;
  public cards$: Observable<Card[]>;
  public cardsPromise;
  public cards: Card[] = [];

  public CardColors = [
    { id: 0, code: 'colorless', name: 'Colorless', img: 'mana.png' },
    { id: 1, code: 'blue',      name: 'Blue',      img: 'blueMana.png' },
    { id: 2, code: 'white',     name: 'White',     img: 'whiteMana.png' },
    { id: 3, code: 'black',     name: 'Black',     img: 'blackMana.png' },
    { id: 4, code: 'red',       name: 'Red',       img: 'redMana.png' },
    { id: 5, code: 'green',     name: 'Green',     img: 'greenMana.png' },
    { id: 6, code: 'special',   name: 'Special',   img: '' },
  ];

  public CardTypes = [
    { id: 0, code: 'land',         name: 'Land', },
    { id: 1, code: 'artifact',     name: 'Artifact', },
    { id: 2, code: 'creature',     name: 'Creature', },
    { id: 3, code: 'instant',      name: 'Instant Spell', },
    { id: 4, code: 'sorcery',      name: 'Sorcery', },
    { id: 5, code: 'interrupt',    name: 'Interrupt', },
    { id: 6, code: 'enchantment',  name: 'Enchantment', },
  ];

  constructor(
    private afs: AngularFirestore,
  ) {
    

    this.cardsCollection = afs.collection('cards');
    this.cards$ = this.cardsCollection.snapshotChanges().pipe(
      RxOp.map(actions => {
        return actions.map(a => {
          let data = a.payload.doc.data() as Card;
          data.id = a.payload.doc.id;

          // Find the highest ID (c9999)
          const numId = Number.parseInt(data.id.slice(1));
          data.orderId = ('00000' + numId).slice(-5).toString();

          return data;
        });
      })
    );
    this.cardsPromise = new Promise(resolve => {
      const sub = this.cards$.subscribe((cards: Card[]) => {
        this.cards = cards;
        resolve(cards);
        sub.unsubscribe();
      });
    });
  }

  public getCardById = (cardId) => {
    return this.cards.getById(cardId);
  }


  public getColor(code) {
    return this.CardColors.find(c => c.code === code);
  }

  public getColorName(code) {
    const selObj = this.CardColors.find(c => c.code === code);
    if (!!selObj) { return selObj.name; }
    return '';
  }

  public getType(code) {
    return this.CardTypes.find(t => t.code === code);
  }

  public getTypeName(code) {
    const selObj = this.CardTypes.find(t => t.code === code);
    if (!!selObj) { return selObj.name; }
    return '';
  }
}
