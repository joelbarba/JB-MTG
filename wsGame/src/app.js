"use strict";
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
exports.__esModule = true;
var WSS = require("ws");
var gameEngine_1 = require("./gameEngine");
var port = 8001;
var server = new WSS.Server({
    port: port,
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
        clientNoContextTakeover: true,
        serverNoContextTakeover: true,
        serverMaxWindowBits: 10,
        // Below options specified as default values.
        concurrencyLimit: 10,
        threshold: 1024 // Size (in bytes) below which messages
        // should not be compressed.
    }
});
// When a client connects to the server
server.on('connection', function (ws, request) {
    console.log('- Client Connected');
    ws.send(JSON.stringify({ response: 'connection established' }));
    ws.addEventListener('error', function (err) { return console.error(err); });
    ws.addEventListener('close', function (err) { return console.log('Client disconnected'); });
    ws.onmessage = function (event) { return msgFromClient(JSON.parse(event.data), ws, event); };
    // ws.addEventListener('pong', () => console.log(new Date(), 'PONG'));
    // ws.ping(); console.log(new Date(), 'PING')
});
function broadcast(message) {
    server.clients.forEach(function (ws) { return ws.send(JSON.stringify(message)); });
}
function msgFromClient(message, ws, event) {
    console.log('- Message from client:', message);
    var resp = { response: 'unknown command' };
    switch (message.method) {
        case 'login':
            resp = login(message, ws);
            break;
        case 'go':
            resp = go(message, ws);
            break;
    }
    ws.send(JSON.stringify(__assign(__assign({}, resp), { token: message.token })));
}
function login(message, ws) {
    // TODO: Validate credentials in Firebase
    ws.userId = message.data.userId;
    ws.gameId = message.data.userId;
    ws.gameEngine = new gameEngine_1.GameEngine(message.data.gameId, message.data.userId);
    return { response: 'ok' };
}
// Player finished its manual actions and the game must go on
function go(message, ws) {
    console.log('userId = ' + ws.userId);
    console.log('gameId = ' + ws.gameId);
    ws.gameEngine.loadGame().then(function () {
        ws.gameEngine.runEngine();
    });
    return { response: 'ok' };
}
console.log('*** NodeJS Server up and running ***');
// -------------------------------------------------------------------------- //
