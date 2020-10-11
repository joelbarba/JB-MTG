import * as functions from "firebase-functions";
import * as cors from 'cors';
const corsHandler = cors({origin: true});

export const testApi2 = functions.https.onRequest((request, response) => {
  console.log('---------------------------------------');
  console.log('----------        testApi2       ------');
  console.log('---------------------------------------');
  console.log(new Date());

  return corsHandler(request, response, () => {
    console.log(new Date());
    response.send({ data: "Hello from Firebase! 222" });
  });
});
