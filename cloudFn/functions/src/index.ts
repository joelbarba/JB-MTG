import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import * as cors from 'cors';
const corsHandler = cors({origin: true});

// Useful doc:
// - https://firebase.google.com/docs/functions/get-started?authuser=0
// - Admin Firestore: https://firebase.google.com/docs/reference/admin/node/admin.firestore?authuser=0
// - Add CORS: https://stackoverflow.com/questions/42755131/enabling-cors-in-cloud-functions-for-firebase

// export const exampleFunction= functions.https.onRequest(async (request, response) => {
//        corsHandler(request, response, () => {});
//        //Your code here
// });

// admin.initializeApp();
admin.initializeApp({ credential: admin.credential.applicationDefault() });

export { newUserAuto } from './newUser';
export { newUserApi } from './newUser';
export { newGameApi } from './newGame';


//  https://us-central1-jb-mtg.cloudfunctions.net/helloWorld
export const helloWorld = functions.https.onRequest((request, response) => {
  return corsHandler(request, response, () => {
    response.send({ data: "Hello from Firebase!" });
  });
});
