import * as admin from 'firebase-admin';
// import * as functions from "firebase-functions";
// import * as cors from 'cors';
// const corsHandler = cors({origin: true});

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

// export { newUserAuto } from './newUser';
// export { newUserApi } from './newUser';
export { newGameApi, resetGameApi } from './newGame';
// export { gameActionApi } from './gameAction';

// export { testApi2 } from './testApi';
//
// if (!process.env.testApi || process.env.testApi === 'testApi') {
//   console.log('UEEEEEEEEEEEEEEEE', process.env.testApi);
// }

// export const testApi = functions.https.onRequest((request, response) => {
//   console.log('---------------------------------------');
//   console.log('----------         GO            ------');
//   console.log('---------------------------------------');
//   console.log(new Date());
//
//   return corsHandler(request, response, () => {
//     console.log(new Date());
//     response.send({ data: "Hello from Firebase! 222" });
//   });
// });



//  https://us-central1-jb-mtg.cloudfunctions.net/helloWorld
// export const helloWorld = functions.https.onRequest((request, response) => {
//   return corsHandler(request, response, () => {
//     console.log(new Date());
//     response.send({ data: "Hello from Firebase! 222" });
//   });
// });





// --------------------------------------------------------
// Callable function
// export const addMessage = functions.https.onCall(async (data, context) => {
//   const newVal = { test: 'new val', when: new Date() };
//   await admin.database().ref('/games/-LkenjwC9yrodtnv_cuB').set(newVal);
//   return { data: 'ok '};
// });

// To call it from the front end:
//     private afd: AngularFireDatabase,
//     private aff: AngularFireFunctions,
//   this.aff.functions.useFunctionsEmulator('http://localhost:5000');
//   this.addMessage = this.aff.httpsCallable('addMessage');
//   this.addMessage({ name: 'some-data' }).subscribe(data => {
//     console.log(data);
//   });


// --------------------------------------------------------
// Function triggered on FireStore DB Change
// export const onActionWrite = functions.firestore.document('actions/1').onWrite(async (change, context) => {
//     // Write a value in RealTime DB
//     // const newVal = { test: 'new val', when: new Date() };
//     // await admin.database().ref('/games/1333').set(newVal);
//
//     // Write a value in Firestore
//     // const firestore = admin.firestore();
//     // const colRef = firestore.collection('games');
//     // const docRef = colRef.doc('paNfUdOQfFSccNlBcIvp');
//     // await docRef.update({ life: 999 });
// });
