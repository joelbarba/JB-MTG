import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';


// ----------------------------------------------------------------------
// On user create in Auth, insert a doc in DB too
export const newUserAuto = functions.auth.user().onCreate(async (user, context: functions.EventContext) => {
  const firestore = admin.firestore();
  const colRef = firestore.collection('users');
  
  let username = user.email;
  if (!!user && !!user.email)  {
    username = user.email.split('@')[0];
  }
  const userObj = { 
    name    : user.displayName,
    email   : user.email,
    username: username,
    cards   : []
  };

  const usrRef = colRef.doc(user.uid);
  await usrRef.create(userObj);
  // await usrRef.collection('decks').add({});
});


//  https://us-central1-jb-mtg.cloudfunctions.net/newUserApi?name=User9&email=user9@barba.com
export const newUserApi = functions.https.onRequest(async (request, response) => {
  const firestore = admin.firestore();
  const colRef = firestore.collection('users');
  
  const newUserId = '9999';
  let username = request.query.email;
  if (!!request.query.email)  { username = request.query.email.split('@')[0]; }
  const user = { 
    name    : request.query.name,
    email   : request.query.email,
    username: username,
    cards   : []
  };

  const usrRef = colRef.doc(newUserId);
  await usrRef.create(user);
  // await usrRef.collection('decks').add({});
  response.send(`User ${user.name} added successfully`);
});
