import {Card, IGameCard} from "../../../ngMTG/src/typings";
import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import * as cors from 'cors';
const corsHandler = cors({origin: true});


export const gameActionApi = functions.https.onRequest(async (request, response) => {
  console.log('1.', new Date(), ' - Ini');
  return corsHandler(request, response, async () => {
    console.log('2.', new Date(), ' - Ini cors');
    const firestore = admin.firestore();
    const gameId: string = request.body.gameId;
    const userId: string = request.body.userId;
    const action: string = request.body.action;
    const cardRef: string = request.body.cardRef;
    const cardId: string = cardRef ? cardRef.split('.')[0] : '';

    console.log('---------------------------------------');
    console.log(`---    Game action: ${action}`);
    console.log('---------------------------------------');

    console.log(gameId, userId, cardRef, cardId);


    const gameDoc = firestore.collection('games').doc(gameId);

    const game = await gameDoc.get().then(doc => { return doc.data(); });
    console.log('3.', new Date(), ' - Card');

    if (!game) { response.status(400).jsonp({ error: 'Game not found', gameId }).send(); return; }

    let user;
    if (game.user1.userId === userId) { user = game.user1; }
    if (game.user2.userId === userId) { user = game.user2; }
    if (!user) { response.status(400).jsonp({ error: 'User not found', userId }).send(); return; }

    let deckCard = user.deck.find((c: IGameCard) => c.ref === cardRef);
    const card: Card = await firestore.collection('cards').doc(cardId).get().then(doc => <Card>doc.data());
    console.log('4.', new Date(), ' - Card');

    // console.log('deck Card', deckCard);
    // console.log('Card', card);

    if (action === 'cast') {
      if (deckCard.loc !== 'hand') {
        response.status(400).jsonp({ error: 'Card cannot be summoned', card: deckCard }).send();
        return;
      }
      if (card.type === 'land') {
        deckCard.loc = 'play';
      }
    }

    await gameDoc.set(game);
    console.log('5.', new Date(), ' - Game Saved');

    console.log('---------------------------------------');
    console.log('----------         GO            ------');
    console.log('---------------------------------------');

    response.send({ data: game });
  });
});


