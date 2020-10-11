import {IGameCard, IGameLog, IGameUser} from "../../ngMTG/src/typings";
import * as firebaseAdmin from "firebase-admin";

firebaseAdmin.initializeApp({
  credential: firebaseAdmin.credential.applicationDefault(),
  databaseURL: 'https://jb-mtg.firebaseio.com'
});
const firestore = firebaseAdmin.firestore();


export class GameEngine {
  public gameId = '';
  public userId = '';
  public gameDoc: any;      // Firebase ref (full game)
  public usrGameDoc: any;   // Firebase ref (user game)
  public game: any;     // Firebase game object

  constructor(gameId: string, userId: string) {
    this.gameId = gameId;
    this.userId = userId;
    this.gameDoc = firestore.collection('games').doc(gameId);
    this.loadGame();
  }

  loadGame() {
    return this.gameDoc.get().then(doc => this.game = doc.data());
  }

  runEngine() {
    console.log('game = ' + this.game.status);
    this.game.status = 1; // running
    while (this.game.status === 1) {
      switch (this.game.phase) {
        case  10: this.unTapPhase10(      this.game.player1, 1); break;
        case  20: this.maintenancePhase20(this.game.player1, 1); break;
        case  30: this.drawPhase30(       this.game.player1, 1); break;
        case  40: this.preCombatPhase40(  this.game.player1, 1); break;
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
  }

  public saveGame = () => {
    console.log('- Saving Game to Firebase: ', this.gameId);

    this.gameDoc.set(this.game);

    // Transform full game to user's public game "/games/999 ---> users/888/games/999"

    // Player 1
    const player1Game = JSON.parse(JSON.stringify(this.game));
    player1Game.player1.deck.filter(card => card.loc === 'deck').forEach(card => card.ref = '');
    player1Game.player2.deck.filter(card => card.loc === 'deck').forEach(card => card.ref = '');
    player1Game.player2.deck.filter(card => card.loc === 'hand').forEach(card => card.ref = '');
    firestore.collection('users/' + this.game.player1.userId + '/games').doc(this.gameId).set(player1Game);

    console.log('- Saving Game for Player 1: ', this.game.player1.userId);

    // Player 2
    const player2Game = JSON.parse(JSON.stringify(this.game));
    player2Game.player1.deck.filter(card => card.loc === 'deck').forEach(card => card.ref = '');
    player2Game.player1.deck.filter(card => card.loc === 'hand').forEach(card => card.ref = '');
    player2Game.player2.deck.filter(card => card.loc === 'deck').forEach(card => card.ref = '');
    firestore.collection('users/' + this.game.player2.userId + '/games').doc(this.gameId).set(player2Game);

    console.log('- Saving Game for Player 2: ', this.game.player2.userId);
  };


  // --------------------------------------------------------------------------
  public unTapPhase10(player: any, turn: number) {
    console.log('-- Player ' + turn + ' : unTapPhase');
    player.summonedLands = 0;
    player.deck.filter(dCard => dCard.loc === 'play').forEach(dCard => {
      dCard.isTap = false;
    });
    this.getToNextPhase(this.game.phase);
  }

  // --------------------------------------------------------------------------
  public maintenancePhase20 = (player: IGameUser, turn = 1) => {
    console.log('-- Player ' + turn + ' : maintenancePhase');
    this.getToNextPhase(this.game.phase);
  };

  // --------------------------------------------------------------------------
  public drawPhase30 = (player: IGameUser, turn = 1) => {
    console.log('-- Player ' + turn + ' : drawPhase');
    const deckCards = player.deck.filter(c => c.loc === 'deck');
    if (!deckCards.length) {

      // No cards to draw, user A loses the game :(
      console.error('USER is dead ------------------------------- No more cards in the deck');

    } else {
      deckCards[0].loc = 'hand';
      // console.log('Drawing new card --->', deckCards[0]);
      this.registerAction({ action: 'drawCard', player: 1, params: {
        cardRef: deckCards[0].ref
      }});
    }
    this.getToNextPhase(this.game.phase);
  };

  // --------------------------------------------------------------------------
  public preCombatPhase40 = (player: IGameUser, turn = 1) => {
    console.log('-- Player ' + turn + ' : preCombatPhase');
    player.ready = true;
    this.game.status = 100;  // Wait for the user to do what he needs
  };




  // Jumps to the next phase code
  public getToNextPhase(currPhase: number) {
    let nextPhase;
    switch (currPhase) {
      case  10: nextPhase = 20; break;
      case  20: nextPhase = 30; break;
      case  30: nextPhase = 40; break;
      case  40: nextPhase = 50; break;
      case  50: nextPhase = 60; break;
      case  60: nextPhase = 70; break;
      case  70: nextPhase = 80; break;
      case  80: nextPhase = 110; break;
      case 110: nextPhase = 120; break;
      case 120: nextPhase = 130; break;
      case 130: nextPhase = 140; break;
      case 140: nextPhase = 150; break;
      case 150: nextPhase = 160; break;
      case 160: nextPhase = 170; break;
      case 170: nextPhase = 180; break;
      case 180: nextPhase = 10;  break;
      default: nextPhase = currPhase;
    }
    // this.turn = nextPhase < 100 ? 1 : 2;
    this.game.phase = nextPhase;
    return nextPhase;
  }

  public registerAction = (log: IGameLog) => {
    log.executed = (new Date()).toString();
    this.game.log.push(log);
  };
}

