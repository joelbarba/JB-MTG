import {IGameLog, IGameUser} from "../../ngMTG/src/typings";
import * as WSS from 'ws';
import {GameEngine} from "./gameEngine";




const port = 8001;
const server = new WSS.Server({
  port,
  perMessageDeflate: {
    zlibDeflateOptions: {
      // See zlib defaults.
      chunkSize: 1024,
      memLevel: 7,
      level: 3
    },
    zlibInflateOptions: {
      chunkSize: 10 * 1024
    },
    // Other options settable:
    clientNoContextTakeover: true, // Defaults to negotiated value.
    serverNoContextTakeover: true, // Defaults to negotiated value.
    serverMaxWindowBits: 10, // Defaults to negotiated value.
    // Below options specified as default values.
    concurrencyLimit: 10, // Limits zlib concurrency for perf.
    threshold: 1024 // Size (in bytes) below which messages
    // should not be compressed.
  }
});

// When a client connects to the server
server.on('connection', (ws, request) => {
  console.log('- Client Connected');
  ws.send(JSON.stringify({ response: 'connection established' }));


  ws.addEventListener('error', (err) => console.error(err));
  ws.addEventListener('close', (err) => console.log('Client disconnected'));
  ws.onmessage = (event) => msgFromClient(JSON.parse(event.data), ws, event);

  // ws.addEventListener('pong', () => console.log(new Date(), 'PONG'));
  // ws.ping(); console.log(new Date(), 'PING')
});


function broadcast(message) {
  server.clients.forEach(ws => ws.send(JSON.stringify(message)));
}

function msgFromClient(message, ws, event) {
  console.log('- Message from client:', message);
  let resp = { response: 'unknown command' };
  switch (message.method) {
    case 'login' : resp = login(message, ws); break;
    case 'go'    : resp = go(message, ws); break;
  }
  ws.send(JSON.stringify({ ...resp, token: message.token }));
}

function login(message, ws) {
  // TODO: Validate credentials in Firebase
  ws.userId = message.data.userId;
  ws.gameId = message.data.userId;
  ws.gameEngine = new GameEngine(message.data.gameId, message.data.userId);
  return { response: 'ok' };
}

// Player finished its manual actions and the game must go on
function go(message, ws) {
  console.log('userId = ' + ws.userId);
  console.log('gameId = ' + ws.gameId);
  ws.gameEngine.loadGame().then(() => {
    ws.gameEngine.runEngine();
  });
  return { response: 'ok' };
}




console.log('*** NodeJS Server up and running ***');

// -------------------------------------------------------------------------- //


