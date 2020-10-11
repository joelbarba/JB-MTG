import { ICard, IUser, IUserCard, IDeckCard, UserDeck } from 'src/typings';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { AngularFirestore, AngularFirestoreCollection, AngularFirestoreDocument } from '@angular/fire/firestore';
import * as RxOp from 'rxjs/operators';


@Injectable({ providedIn: 'root' })
export class Globals {
  public cardsCollection: AngularFirestoreCollection<ICard>;
  public cards$: Observable<ICard[]>;
  public cardsPromise;
  public cards: ICard[] = [];

  public CardColors = [
    { id: 0, code: 'colorless', name: 'Colorless', img: 'assets/mana.png' },
    { id: 1, code: 'blue',      name: 'Blue',      img: 'assets/blueMana.png' },
    { id: 2, code: 'white',     name: 'White',     img: 'assets/whiteMana.png' },
    { id: 3, code: 'black',     name: 'Black',     img: 'assets/blackMana.png' },
    { id: 4, code: 'red',       name: 'Red',       img: 'assets/redMana.png' },
    { id: 5, code: 'green',     name: 'Green',     img: 'assets/greenMana.png' },
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
    this.collapseBars(false);

    // this.cardsCollection = afs.collection('cards');
    // this.cards$ = this.cardsCollection.snapshotChanges().pipe(
    //   RxOp.map(actions => {
    //     return actions.map(a => {
    //       let data = a.payload.doc.data() as ICard;
    //       data.id = a.payload.doc.id;

    //       // Find the highest ID (c9999)
    //       const numId = Number.parseInt(data.id.slice(1));
    //       data.orderId = ('000000' + numId).slice(-6).toString();

    //       return data;
    //     });
    //   })
    // );
    // this.cardsPromise = new Promise(resolve => {
    //   const sub = this.cards$.subscribe((cards: ICard[]) => {
    //     this.cards = cards;
    //     resolve(cards);
    //     sub.unsubscribe();
    //   });
    // });
  }

  public getCardById = (cardId) => this.cards.getById(cardId);
  public getCardByRef = (cardRef: string): ICard => this.getCardById(this.getCardIdByRef(cardRef));
  public getColor = (code) => this.CardColors.find(c => c.code === code);
  public getType = (code) => this.CardTypes.find(t => t.code === code);

  public getColorName = (code) => {
    const selObj = this.CardColors.find(c => c.code === code);
    if (!!selObj) { return selObj.name; }
    return '';
  }

  public getTypeName(code) {
    const selObj = this.CardTypes.find(t => t.code === code);
    if (!!selObj) { return selObj.name; }
    return '';
  }

  public getCardIdByRef = (cardRef: string): string => {
    if (!cardRef) { return ''; }
    return cardRef.split('.')[0];
  };

  public getCardObjByRef = (cardRef: string): IUserCard => {
    if (!cardRef) { return { ref: cardRef, card: null }; }
    const cardId = cardRef.split('.')[0];
    return { ref: cardRef, card: this.getCardById(cardId) };
  };

  // Returns a promise that resolves a user (1 time load)
  public getUser = (userId: string): Promise<IUser> => {
    return this.afs.doc<IUser>('/users/' + userId).valueChanges().toPromise();
    // return new Promise((resolve) => {
    //   const sub1 = this.afs.doc<IUser>('/users/' + userId).valueChanges().subscribe(data => {
    //     sub1.unsubscribe();
    //     resolve(data);
    //   });
    // });
  }

  // Returns a promise that resolves a user deck (1 time load)
//   public getUserDeck = (userId: string, deckId: string): Promise<UserDeck> => {
//     return new Promise((resolve) => {
//       const sub1 = this.afs.doc<UserDeck>('/users/' + userId + '/decks/' + deckId).valueChanges().subscribe(data => {
//         sub1.unsubscribe();
//         resolve(data);
//       });
//     });
//   }


  // Expand / collapse menu and navbar when game mode
  public isGameMode = false;     // Whether there is an ongoing game (collapse menu/navbar)
  public isBarsCollapsed = true;  // Whether menu and navbar are collapsed
  private delayTimeout;
  public collapseBars = (value) => {
    if (!!this.delayTimeout) { clearTimeout(this.delayTimeout); }
    if (this.isGameMode && value) {
      this.delayTimeout = setTimeout(() => { this.isBarsCollapsed = true; }, 500);
    } else {
      this.isBarsCollapsed = false;
    }
  }
}
