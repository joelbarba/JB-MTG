import { IGameCard} from "../../../ngMTG/src/typings";

import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import * as cors from 'cors';
const corsHandler = cors({origin: true});


// Create a new game
export const newGameApi = functions.https.onRequest(async (request, response) => {
  return corsHandler(request, response, async () => {
    const firestore = admin.firestore();
    const userId1 = request.query.user1;
    const deckId1 = request.query.deck1;
    const userId2 = request.query.user2;
    const deckId2 = request.query.deck2;

    const userInit = {
      life     : 20,
      ready    : false,
      manaPool : [0, 0, 0, 0, 0, 0],
      deck     : [],
      summonedLands : 0
    };

    const newGame: any = {
      created  : (new Date()).toString(),
      status   : 0,   // 0=running, 1=paused on userA, 2=paused on user B
      phase    : 10,  // 10=untap, 20=maintenance, 30=draw, 40=pre-combat, 50=combat, 60=post-combat, 70=discard, 80=end
      log      : [],
      lastPlayer : null,
      lastToken  : null,
      player1  : {
        ...userInit,
        userName : 'First User',
        userId   : userId1,
        deckId   : deckId1
      },
      player2    : {
        ...userInit,
        userName : 'Second User',
        userId   : userId2,
        deckId   : deckId2,
      }
    };

    const user1Ref = firestore.collection('users').doc(userId1);
    const user2Ref = firestore.collection('users').doc(userId2);

    // Initialize the deck, shuffle and pick 7 cards
    await user1Ref.collection('decks').doc(deckId1).get().then(doc => {
      initDeck(newGame.player1, doc.data());
    });
    await user2Ref.collection('decks').doc(deckId2).get().then(doc => {
      initDeck(newGame.player2, doc.data());
    });


    console.log('---------------------------------------');
    console.log('----------   NEW GAME READY   ---------');
    console.log('---------------------------------------');


    // Save to FireStore
    const gamesColRef = firestore.collection('games');
    const newRef = await gamesColRef.add(newGame);
    newGame.id = newRef.id;

    // Create accessible data of the game for: Player 1
    const player1Game = JSON.parse(JSON.stringify(newGame));
    player1Game.player1.deck.forEach((card: IGameCard) => {
      if (card.loc === 'deck') { card.ref = ''; }
    });
    player1Game.player2.deck.forEach((card: IGameCard) => card.ref = '');
    user1Ref.collection('games').doc(player1Game.id).set(player1Game);


    // Create accessible data of the game for: Player 2
    const player2Game = JSON.parse(JSON.stringify(newGame));
    player2Game.player1.deck.forEach((card: IGameCard) => card.ref = '');
    player2Game.player2.deck.forEach((card: IGameCard) => {
      if (card.loc === 'deck') { card.ref = ''; }
    });
    user2Ref.collection('games').doc(player2Game.id).set(player2Game);


    // Generate a game with no private data
    const pubGame = JSON.parse(JSON.stringify(newGame));
    pubGame.player1.deck.forEach((card: IGameCard) => card.ref = '');
    pubGame.player2.deck.forEach((card: IGameCard) => card.ref = '');

    console.log('PLAYER 1 DECK =====> ', pubGame.player1.deck.length);
    console.log('PLAYER 2 DECK =====> ', pubGame.player2.deck.length);

    response.send(pubGame);

  });
});



// DEV Only: Reset a current game
export const resetGameApi = functions.https.onRequest(async (request, response) => {
  return corsHandler(request, response, async () => {
    const firestore = admin.firestore();
    const gameId = request.query.gameId;

    const gameDoc = firestore.collection('games').doc(gameId);
    const game = await gameDoc.get().then(doc => { return doc.data(); });
    if (!game) { response.status(400).jsonp({ error: 'Game not found', gameId }).send(); return; }

    let newGame: any = {
      created  : (new Date()).toString(),
      status   : 0,   // 0=running, 1=paused on userA, 2=paused on user B
      phase    : 10,  // 10=untap, 20=maintenance, 30=draw, 40=pre-combat, 50=combat, 60=post-combat, 70=discard, 80=end
      lastPlayer : null,
      lastToken  : null,
      log      : [],
      player1    : {
        userName : game.player1.userName,
        userId   : game.player1.userId,
        deckId   : game.player1.deckId,
        life     : 20,
        ready    : true,
        manaPool : [0, 0, 0, 0, 0, 0],
        deck     : [],
        summonedLands : 0
      },
      player2      : {
        userName : game.player2.userName,
        userId   : game.player2.userId,
        deckId   : game.player2.deckId,
        life     : 20,
        ready    : true,
        manaPool : [0, 0, 0, 0, 0, 0],
        deck     : [],
        summonedLands : 0
      }
    };

    const user1Ref = firestore.collection('users').doc(game.player1.userId);
    const user2Ref = firestore.collection('users').doc(game.player2.userId);

    await user1Ref.collection('decks').doc(game.player1.deckId).get().then(doc => {
      initDeck(newGame.player1, doc.data());
    });
    await user2Ref.collection('decks').doc(game.player1.deckId).get().then(doc => {
      initDeck(newGame.player2, doc.data());
    });

    await gameDoc.set(newGame);

    console.log('---------------------------------------');
    console.log('------------   GAME RESET   -----------');
    console.log('---------------------------------------');

    response.send({ data: newGame });

  });
});


const initDeck = (user: any, deck: any) => {
  user.deck = [];
  if (!!deck) {
    user.deckName = deck.name;
    user.deck = deck.cards
      .map((ref: string) => ({ ref, deckOrder: Math.round(Math.random() * 99999) }))
      .sort((a: IGameCard, b: IGameCard) => a.deckOrder > b.deckOrder ? 1 : -1)
      .map((card: IGameCard, ind: number) => {
        return {
          id        : uuidv4(),
          ref       : card.ref,
          deckOrder : ind + 1,
          playOrder : 0,
          loc       : 'deck',
          isTap     : false,
          damage    : 0,
        }
      });

    // Move 7 first cards to hand
    user.deck
      .filter((c: IGameCard) => c.deckOrder <= 7)
      .forEach((c: IGameCard) => c.loc = 'hand');
  }
};

function uuidv4() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}
