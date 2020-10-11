"use strict";
exports.__esModule = true;
var firebaseAdmin = require("firebase-admin");
firebaseAdmin.initializeApp({
    credential: firebaseAdmin.credential.applicationDefault(),
    databaseURL: 'https://jb-mtg.firebaseio.com'
});
var firestore = firebaseAdmin.firestore();
var GameEngine = /** @class */ (function () {
    function GameEngine(gameId, userId) {
        var _this = this;
        this.gameId = '';
        this.userId = '';
        this.saveGame = function () {
            console.log('- Saving Game to Firebase: ', _this.gameId);
            _this.gameDoc.set(_this.game);
            // Transform full game to user's public game "/games/999 ---> users/888/games/999"
            // Player 1
            var player1Game = JSON.parse(JSON.stringify(_this.game));
            player1Game.player1.deck.filter(function (card) { return card.loc === 'deck'; }).forEach(function (card) { return card.ref = ''; });
            player1Game.player2.deck.filter(function (card) { return card.loc === 'deck'; }).forEach(function (card) { return card.ref = ''; });
            player1Game.player2.deck.filter(function (card) { return card.loc === 'hand'; }).forEach(function (card) { return card.ref = ''; });
            firestore.collection('users/' + _this.game.player1.userId + '/games').doc(_this.gameId).set(player1Game);
            console.log('- Saving Game for Player 1: ', _this.game.player1.userId);
            // Player 2
            var player2Game = JSON.parse(JSON.stringify(_this.game));
            player2Game.player1.deck.filter(function (card) { return card.loc === 'deck'; }).forEach(function (card) { return card.ref = ''; });
            player2Game.player1.deck.filter(function (card) { return card.loc === 'hand'; }).forEach(function (card) { return card.ref = ''; });
            player2Game.player2.deck.filter(function (card) { return card.loc === 'deck'; }).forEach(function (card) { return card.ref = ''; });
            firestore.collection('users/' + _this.game.player2.userId + '/games').doc(_this.gameId).set(player2Game);
            console.log('- Saving Game for Player 2: ', _this.game.player2.userId);
        };
        // --------------------------------------------------------------------------
        this.maintenancePhase20 = function (player, turn) {
            if (turn === void 0) { turn = 1; }
            console.log('-- Player ' + turn + ' : maintenancePhase');
            _this.getToNextPhase(_this.game.phase);
        };
        // --------------------------------------------------------------------------
        this.drawPhase30 = function (player, turn) {
            if (turn === void 0) { turn = 1; }
            console.log('-- Player ' + turn + ' : drawPhase');
            var deckCards = player.deck.filter(function (c) { return c.loc === 'deck'; });
            if (!deckCards.length) {
                // No cards to draw, user A loses the game :(
                console.error('USER is dead ------------------------------- No more cards in the deck');
            }
            else {
                deckCards[0].loc = 'hand';
                // console.log('Drawing new card --->', deckCards[0]);
                _this.registerAction({ action: 'drawCard', player: 1, params: {
                        cardRef: deckCards[0].ref
                    } });
            }
            _this.getToNextPhase(_this.game.phase);
        };
        // --------------------------------------------------------------------------
        this.preCombatPhase40 = function (player, turn) {
            if (turn === void 0) { turn = 1; }
            console.log('-- Player ' + turn + ' : preCombatPhase');
            player.ready = true;
            _this.game.status = 100; // Wait for the user to do what he needs
        };
        this.registerAction = function (log) {
            log.executed = (new Date()).toString();
            _this.game.log.push(log);
        };
        this.gameId = gameId;
        this.userId = userId;
        this.gameDoc = firestore.collection('games').doc(gameId);
        this.loadGame();
    }
    GameEngine.prototype.loadGame = function () {
        var _this = this;
        return this.gameDoc.get().then(function (doc) { return _this.game = doc.data(); });
    };
    GameEngine.prototype.runEngine = function () {
        console.log('game = ' + this.game.status);
        this.game.status = 1; // running
        while (this.game.status === 1) {
            switch (this.game.phase) {
                case 10:
                    this.unTapPhase10(this.game.player1, 1);
                    break;
                case 20:
                    this.maintenancePhase20(this.game.player1, 1);
                    break;
                case 30:
                    this.drawPhase30(this.game.player1, 1);
                    break;
                case 40:
                    this.preCombatPhase40(this.game.player1, 1);
                    break;
                // case  50: this.combatPhase50(     turnPlayer, 1); break;
                // case  60: this.postCombatPhase60( turnPlayer, 1); break;
                // case  70: this.discardPhase70(    turnPlayer, 1); break;
                // case  80: this.endPhase80(        turnPlayer, 1); break;
                // case 110: this.unTapPhase10(      turnPlayer, 2); break;
                // case 120: this.maintenancePhase20(turnPlayer, 2); break;
                // case 130: this.drawPhase30(       turnPlayer, 2); break;
                // case 140: this.preCombatPhase40(  turnPlayer, 2); break;
                // case 150: this.combatPhase50(     turnPlayer, 2); break;
                // case 160: this.postCombatPhase60( turnPlayer, 2); break;
                // case 170: this.discardPhase70(    turnPlayer, 2); break;
                // case 180: this.endPhase80(        turnPlayer, 2); break;
            }
        }
        // Once loop finished, save new game
        this.saveGame();
    };
    // --------------------------------------------------------------------------
    GameEngine.prototype.unTapPhase10 = function (player, turn) {
        console.log('-- Player ' + turn + ' : unTapPhase');
        player.summonedLands = 0;
        player.deck.filter(function (dCard) { return dCard.loc === 'play'; }).forEach(function (dCard) {
            dCard.isTap = false;
        });
        this.getToNextPhase(this.game.phase);
    };
    // Jumps to the next phase code
    GameEngine.prototype.getToNextPhase = function (currPhase) {
        var nextPhase;
        switch (currPhase) {
            case 10:
                nextPhase = 20;
                break;
            case 20:
                nextPhase = 30;
                break;
            case 30:
                nextPhase = 40;
                break;
            case 40:
                nextPhase = 50;
                break;
            case 50:
                nextPhase = 60;
                break;
            case 60:
                nextPhase = 70;
                break;
            case 70:
                nextPhase = 80;
                break;
            case 80:
                nextPhase = 110;
                break;
            case 110:
                nextPhase = 120;
                break;
            case 120:
                nextPhase = 130;
                break;
            case 130:
                nextPhase = 140;
                break;
            case 140:
                nextPhase = 150;
                break;
            case 150:
                nextPhase = 160;
                break;
            case 160:
                nextPhase = 170;
                break;
            case 170:
                nextPhase = 180;
                break;
            case 180:
                nextPhase = 10;
                break;
            default: nextPhase = currPhase;
        }
        // this.turn = nextPhase < 100 ? 1 : 2;
        this.game.phase = nextPhase;
        return nextPhase;
    };
    return GameEngine;
}());
exports.GameEngine = GameEngine;
