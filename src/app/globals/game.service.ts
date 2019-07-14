import { Card, User, UserCard, UserDeck, IGame } from 'src/typings';
import './prototypes';
import { Injectable } from '@angular/core';
import { AngularFirestore, AngularFirestoreCollection, AngularFirestoreDocument } from '@angular/fire/firestore';
import { Observable, BehaviorSubject } from 'rxjs';
import { Globals } from './globals.service';
import * as RxOp from 'rxjs/operators';
import { stringify } from 'querystring';


@Injectable({
 providedIn: 'root'
})
export class GameService {
  public status = 0;    // 0 = off, 1 = ongoing
  public currGameId: string;

  public status$;

  public gameDoc: AngularFirestoreDocument<IGame>;
  public gamesCollection: AngularFirestoreCollection<IGame>;

  public state;

  constructor(
    private afs: AngularFirestore,
    private globals: Globals,
  ) {

    this.currGameId = 'vtylhfWVziYsEByeEN6g';
    this.gameDoc = this.afs.doc<IGame>('/games/' + this.currGameId);
    // const subs = this.gameDoc.snapshotChanges().subscribe(state => {
    //   const data = state.payload.data();
    // });
    this.status$ = this.gameDoc.valueChanges().pipe(
      RxOp.map((game: IGame) => game.status)
    );

  }


  // This logic should go to the backend later
  public createNewGame = async () => {
    const gameParams = {
      userA: {
        user_id: 'zJa8V4puqphDwIl8bvjNQcaDvwF2',  // Joel
        deck_id: 'LnsXDBvu8IdMJuBK3i3k'           // Test 1
      },
      userB: {
        user_id: 'B2smfxAYD7X1Y4DZth4S5nMv0uC2',  // Bob
        deck_id: 'I1belIFq6eFvgmLxZDLA'           // Super Black
      },
    };

    const userA = await this.globals.getUser(gameParams.userA.user_id);
    const userB = await this.globals.getUser(gameParams.userB.user_id);
    const deckA = await this.globals.getUserDeck(gameParams.userA.user_id, gameParams.userA.deck_id);
    const deckB = await this.globals.getUserDeck(gameParams.userB.user_id, gameParams.userB.deck_id);

    let newGame: any = {
      created: (new Date()).toString(),
      status: 0,
      deckA,
      deckB,
      userA: {
        userName : userA.name,
        user_id  : gameParams.userA.user_id,
        deck_id  : gameParams.userA.deck_id,
        life   : 20,
        phase  : 0,
        ready  : false,
        deck   : []
      },
      userB: {
        userName : userB.name,
        user_id  : gameParams.userB.user_id,
        deck_id  : gameParams.userB.deck_id,
        life   : 20,
        phase  : 0,
        ready  : false,
        deck   : []
      }
    };

    // Suffle User A's deck
    newGame.userA.deck = newGame.deckA.cards
      .map(c => ({ ...c, order: Math.round(Math.random() * 99999) }))
      .sort((a, b) => a.order > b.order ? 1 : -1)
      .map((c, ind) => {
        const order = ind + 1;
        const card = this.globals.getCardById(c.id);
        delete card.units;
        return { ...c, card, order, loc: 'deck' };
      });
    newGame.userA.deck.filter(c => c.order <= 9).forEach(c => c.loc = 'hand'); // Move 7 first cards on hand


    // Suffle User B's deck
    newGame.userB.deck = newGame.deckB.cards
      .map(c => ({ ...c, order: Math.round(Math.random() * 99999) }))
      .sort((a, b) => a.order > b.order ? 1 : -1)
      .map((c, ind) => {
        const order = ind + 1;
        const card = this.globals.getCardById(c.id);
        delete card.units;
        return { ...c, card, order, loc: 'deck' };
      });
    newGame.userB.deck.filter(c => c.order <= 7).forEach(c => c.loc = 'hand'); // Move 7 first cards on hand


    this.state = newGame;
    console.log(newGame);

    return this.state;
    // this.gamesCollection.add(newGame);
  }


}
