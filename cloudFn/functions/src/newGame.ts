import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import * as cors from 'cors';
const corsHandler = cors({origin: true});


//  https://us-central1-jb-mtg.cloudfunctions.net/newGameApi?user1=123&deck1=123&user2=123&deck2=123
export const newGameApi = functions.https.onRequest((request, response) => {
  return corsHandler(request, response, () => {
    const firestore = admin.firestore();
    const userId1 = request.query.user1;
    const deckId1 = request.query.deck2;
    const userId2 = request.query.user2;
    const deckId2 = request.query.deck2;

    let newGame: any = {
      created  : (new Date()).toString(),
      status   : 10,   // 0=running, 1=paused on userA, 2=paused on user B
      phase    : 10,  // 10=untap, 20=maintenance, 30=draw, 40=pre-combat, 50=combat, 60=post-combat, 70=discard, 80=end
      user1    : {
        userName : 'First User',
        userId   : userId1,
        deckId   : deckId1,
        life     : 20,
        ready    : true,
        manaPool : [0, 0, 0, 0, 0, 0],
        deck     : [],
      },
      user2      : {
        userName : 'Second User',
        userId   : userId2,
        deckId   : deckId2,
        life     : 20,
        ready    : true,
        manaPool : [0, 0, 0, 0, 0, 0],
        deck     : [],
      }
    };


    // await firestore.collection('users').doc(userId1).onSnapshot(doc => {
    //   newGame.user = doc.data();
    // });
    // await firestore.collection('users').doc(userId1).get().then(doc => {
    //   newGame.user = doc.data();
    // });

    const gamesColRef = firestore.collection('games');
    gamesColRef.doc().create(newGame).then(() => {

      response.send({ data: newGame });
    });




    // Suffle User 1's deck
    // newGame.userA.deck = newGame.deckA.cards
    //   .map(c => ({ ...c, order: Math.round(Math.random() * 99999) }))
    //   .sort((a, b) => a.order > b.order ? 1 : -1)
    //   .map((c, ind) => {
    //     const order = ind + 1;
    //     const card = this.globals.getCardById(c.id);
    //     delete card.units;
    //     return { ...c, card, order, loc: 'deck', isTap: false };
    //   });
    // newGame.userA.deck.filter(c => c.order <= 7).forEach(c => c.loc = 'hand'); // Move 7 first cards on hand


    // Suffle User 2's deck
    // newGame.userB.deck = newGame.deckB.cards
    //   .map(c => ({ ...c, order: Math.round(Math.random() * 99999) }))
    //   .sort((a, b) => a.order > b.order ? 1 : -1)
    //   .map((c, ind) => {
    //     const order = ind + 1;
    //     const card = this.globals.getCardById(c.id);
    //     delete card.units;
    //     return { ...c, card, order, loc: 'deck', isTap: false };
    //   });
    // newGame.userB.deck.filter(c => c.order <= 7).forEach(c => c.loc = 'hand'); // Move 7 first cards on hand


    // const gameRef = colRef.doc();
    // await gameRef.create(newGame);
    // // await usrRef.collection('decks').add({});
    // response.send(newGame);
  });
});