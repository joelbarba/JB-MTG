import {Card, User, DeckCard, UserDeck, IGame, IGameCard, IGameLog, IGameUser} from 'src/typings';
import './prototypes';
import { Injectable } from '@angular/core';
import { AngularFirestore, AngularFirestoreCollection, AngularFirestoreDocument } from '@angular/fire/firestore';
import { Observable, BehaviorSubject } from 'rxjs';
import { Globals } from './globals.service';
import * as RxOp from 'rxjs/operators';
import { stringify } from 'querystring';
import { BfGrowlService, BfConfirmService } from 'bf-ui-lib';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import {Profile} from './profile.service';

const httpOptions = {
  headers: new HttpHeaders({ 'Content-Type':  'application/json' })
};

@Injectable({
 providedIn: 'root'
})
export class GameService {
  public status = 0;    // 0 = off, 1 = ongoing

  public gameId: string;
  public game: IGame;
  public myPlayerNum: null | 1 | 2;

  // public readonly baseUrl = 'https://us-central1-jb-mtg.cloudfunctions.net';
  public readonly baseUrl = 'http://localhost:5000/jb-mtg/us-central1';


  public status$;

  public gameDoc: AngularFirestoreDocument<IGame>;
  public gamesCollection: AngularFirestoreCollection<IGame>;

  public turnState;
  public phaseState;

  constructor(
    private afs: AngularFirestore,
    private globals: Globals,
    private profile: Profile,
    private growl: BfGrowlService,
    private http: HttpClient,
  ) {
  }


  // This logic should go to the backend later
  public createNewGame = () => {
    const user1 = 'zJa8V4puqphDwIl8bvjNQcaDvwF2'; // Joel
    const deck1 = 'k6NYK31X4RuMoAP0BUaE';         // Red Fire
    const user2 = 'B2smfxAYD7X1Y4DZth4S5nMv0uC2'; // Bob
    const deck2 = 'aM0wbWZ26iUow9bSetMF';         // Super Black
    const url = `${this.baseUrl}/newGameApi?user1=${user1}&deck1=${deck1}&user2=${user2}&deck2=${deck2}`;
    return this.http.post(url, {}, httpOptions).toPromise().then((data: any) => {
      console.log('GAME Created!', data);
      return data;
    });
  };


  // This logic should go to the backend later
  public resetGame = () => {
    const url = `${this.baseUrl}/resetGameApi?gameId=${this.gameId}`;
    this.http.post(url, {}, httpOptions).toPromise().then((data: any) => {
      this.growl.success('Game reset!');
    });
  };


  // --- Actions ----

  // Jump to the next one
  public finishPhase = (player) => {
    player.ready = true;
    const prevPhase = this.game.phase;
    this.getToNextPhase(this.game.phase);
    this.registerAction({ action: 'finishPhase', player: player.$numPlayer, params: { phase: prevPhase }});
    this.runEngine();
  };

  public summonCard = (user, selCard) => {
    if (selCard.loc !== 'hand') {
      return false;
    }
    const totalPlay = user.deck.filter(dCard => dCard.loc === 'play').length;

    // Summon Land
    if (selCard.$card.type === 'land') {
      if (user.summonedLands > 0) {
        this.growl.error('You shall not summon more than one land per turn');
        return false;
      }
      selCard.loc = 'play';
      selCard.playOrder = totalPlay;
      user.summonedLands++;
      selCard.posX = (totalPlay * 100) + 10;
      selCard.posY = 50;
      this.growl.success(`${selCard.$card.name} summoned`);
      this.registerAction({ action: 'summonLand', player: user.$numPlayer, params: {
        cardRef: selCard.ref
      }});
      this.saveGame();
    }

    // Summon Creature
    if (selCard.$card.type === 'creature') {
      if (!this.takeMana(user.manaPool, selCard.$card.cast)) {
        this.growl.error(`Not enough mana to summon ${selCard.$card.name}`);
        return false;
      }
      selCard.loc = 'play';
      selCard.playOrder = totalPlay;
      selCard.summoningSickness = true;
      selCard.posX = (totalPlay * 100) + 10;
      selCard.posY = 50;
      this.growl.success(`${selCard.$card.name} summoned`);
    }

    // Interrupt
    if (selCard.$card.type === 'interrupt') {
      if (!this.takeMana(user.manaPool, selCard.$card.cast)) {
        this.growl.error(`Not enough mana to cast ${selCard.$card.name}`);
        return false;
      }
      selCard.loc = 'play';
      selCard.playOrder = totalPlay;
      selCard.posX = (totalPlay * 100) + 10;
      selCard.posY = 50;
      if (selCard.$card.id === 'c000027') { // Dark Ritual
        user.manaPool[3] = user.manaPool[3] + 3;
        selCard.loc = 'grav';
        this.growl.success(`${selCard.$card.name} cast. 3 black mana added`);
      }

    }
  };

  public tapCard = (user, selCard) => {
    if (selCard.loc === 'play' && selCard.$card.type === 'land' && !selCard.isTap) {
      selCard.isTap = true;
      if (selCard.$card.id === 'c000001') { user.manaPool[1]++; }  // Island
      if (selCard.$card.id === 'c000002') { user.manaPool[2]++; }  // Plains
      if (selCard.$card.id === 'c000003') { user.manaPool[3]++; }  // Swamp
      if (selCard.$card.id === 'c000004') { user.manaPool[4]++; }  // Mountain
      if (selCard.$card.id === 'c000005') { user.manaPool[5]++; }  // Forest
      this.registerAction({ action: 'tapLand', player: user.$numPlayer, params: { cardRef: selCard.ref }});
    }
    this.saveGame();
  };




  public runEngine = () => {
    const game = this.game;

    game.status = 1; // running
    while (game.status === 1) {
      const turnPlayer = this.myPlayerNum === game.$turn ? this.game.$playerMe : this.game.$playerOp;
      switch (game.phase) {
        case  10: this.unTapPhase10(      turnPlayer, 1); break;
        case  20: this.maintenancePhase20(turnPlayer, 1); break;
        case  30: this.drawPhase30(       turnPlayer, 1); break;
        case  40: this.preCombatPhase40(  turnPlayer, 1); break;
        case  50: this.combatPhase50(     turnPlayer, 1); break;
        case  60: this.postCombatPhase60( turnPlayer, 1); break;
        case  70: this.discardPhase70(    turnPlayer, 1); break;
        case  80: this.endPhase80(        turnPlayer, 1); break;
        case 110: this.unTapPhase10(      turnPlayer, 2); break;
        case 120: this.maintenancePhase20(turnPlayer, 2); break;
        case 130: this.drawPhase30(       turnPlayer, 2); break;
        case 140: this.preCombatPhase40(  turnPlayer, 2); break;
        case 150: this.combatPhase50(     turnPlayer, 2); break;
        case 160: this.postCombatPhase60( turnPlayer, 2); break;
        case 170: this.discardPhase70(    turnPlayer, 2); break;
        case 180: this.endPhase80(        turnPlayer, 2); break;
      }
    }

    // Once loop finished, save new game
    this.saveGame();
  };


  // --------------------------------------------------------------------------
  public unTapPhase10 = (player: IGameUser, turn = 1) => {
    player.summonedLands = 0;
    player.deck.filter(dCard => dCard.loc === 'play').forEach(dCard => {
      dCard.isTap = false;
    });
    this.getToNextPhase(this.game.phase);
  };

  // --------------------------------------------------------------------------
  public maintenancePhase20 = (player: IGameUser, turn = 1) => {
    this.getToNextPhase(this.game.phase);
  };

  // --------------------------------------------------------------------------
  public drawPhase30 = (player: IGameUser, turn = 1) => {
    const deckCards = player.deck.filter(c => c.loc === 'deck');
    if (!deckCards.length) {
      // No cards to draw, user A loses the game :(
      console.error('USER is dead ------------------------------- No more cards in the deck');

    } else {
      deckCards[0].loc = 'hand';
      console.log('Drawing new card --->', deckCards[0]);
      this.registerAction({ action: 'drawCard', player: 1, params: {
        cardRef: deckCards[0].ref
      }});
    }
    this.getToNextPhase(this.game.phase);
  };

  // --------------------------------------------------------------------------
  public preCombatPhase40 = (player: IGameUser, turn = 1) => {
    player.ready = false;
    this.game.status = 100;  // Wait for the user to do what he needs
    // this.getToNextPhase(this.game.phase);
  };

  // --------------------------------------------------------------------------
  public combatPhase50 = (player: IGameUser, turn = 1) => {
    // If no creatures in play, skip combat and after-combat phase
    if (player.deck.filter(c => c.loc === 'play' && c.$card.type === 'creature').length) {
      this.game.status = 101;  // Wait for the user to attack
      player.ready = false;
    } else {
      // No possible attack, skip phase
      this.getToNextPhase(this.game.phase);
    }
  };

  // --------------------------------------------------------------------------
  public postCombatPhase60 = (player: IGameUser, turn = 1) => {
    player.ready = false;
    this.game.status = 100;  // Wait for the user to do what he needs
    // this.getToNextPhase(this.game.phase);
  };

  // --------------------------------------------------------------------------
  public discardPhase70 = (player: IGameUser, turn = 1) => {
    if (player.deck.filter(dCard => dCard.loc === 'hand').length > 7) {
      this.game.status = 102;  // Wait for the user to discard
      player.ready = false;
    } else {
      this.getToNextPhase(this.game.phase);
    }
  };

  // --------------------------------------------------------------------------
  public endPhase80 = (player: IGameUser, turn = 1) => {
    // Mana burn
    const manaLeft = player.manaPool[0] + player.manaPool[1] + player.manaPool[2]
                   + player.manaPool[3] + player.manaPool[4] + player.manaPool[5];
    if (manaLeft > 0) {
      player.life = player.life - manaLeft;
      player.manaPool = [0, 0, 0, 0, 0, 0];
      this.growl.error(`Mana Burn: The ${manaLeft} mana left on your mana pool damaged you`);
    }
    this.getToNextPhase(this.game.phase);
  };




  // ---- Internals ------

  // From a given mana pool, substract the cast.
  // If possible return true. If not possible, do not substract anything and return false
  public takeMana = (manaPool, cast, clCast?): boolean => {
    const pool = manaPool.dCopy();
    for (let i = 1; i <= 5; i++) { pool[i] -= cast[i]; }
    if (pool.some(mana => mana < 0)) { return false; } // No enough color mana to cast

    let cMana = cast[0]; // Colorless mana
    if (!clCast) {
      // Try to take the colorless mana from wherever is possible
      if (cMana <= pool[0]) { pool[0] -= cMana; cMana = 0; } else { cMana -= pool[0]; pool[0] = 0; }
      if (cMana <= pool[1]) { pool[1] -= cMana; cMana = 0; } else { cMana -= pool[1]; pool[1] = 0; }
      if (cMana <= pool[2]) { pool[2] -= cMana; cMana = 0; } else { cMana -= pool[2]; pool[2] = 0; }
      if (cMana <= pool[3]) { pool[3] -= cMana; cMana = 0; } else { cMana -= pool[3]; pool[3] = 0; }
      if (cMana <= pool[4]) { pool[4] -= cMana; cMana = 0; } else { cMana -= pool[4]; pool[4] = 0; }
      if (cMana <= pool[5]) { pool[5] -= cMana; cMana = 0; } else { cMana -= pool[5]; pool[5] = 0; }
    }

    if (cMana > 0 || pool.some(mana => mana < 0)) {
      return false; // No enough mana to cast
    } else {
      for (let i = 0; i <= 5; i++) { manaPool[i] = pool[i]; }
      return true;
    }
  };

  // Jumps to the next phase code
  public getToNextPhase = (currPhase: number) => {
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
      default: nextPhase = this.game.phase;
    }
    this.game.$turn = nextPhase < 100 ? 1 : 2;
    this.game.phase = nextPhase;
    return nextPhase;
  };


  public registerAction = (log: IGameLog) => {
    log.executed = (new Date()).toString();
    this.game.log.push(log);
  };

  public saveGame = () => {
    this.game.lastPlayer = this.myPlayerNum;
    this.game.lastToken = this.afs.createId();
    const gameDoc = this.afs.doc('/games/' + this.gameId);
    return gameDoc.set(this.decorateGameOut(this.game));
  };


  // Get the game from DB (Firestore) and adds $ extended values
  public decorateGameIn = (game: IGame): IGame => {
    const $game = <IGame>game.dCopy();
    if ($game.player1.userId === this.profile.userId) {
      $game.$playerMe = $game.player1; $game.$playerMe.$numPlayer = 1;
      $game.$playerOp = $game.player2; $game.$playerOp.$numPlayer = 2;
    } else {
      $game.$playerMe = $game.player2; $game.$playerMe.$numPlayer = 2;
      $game.$playerOp = $game.player1; $game.$playerOp.$numPlayer = 1;
    }
    $game.player1.deck.forEach((deckCard: IGameCard) => {
      deckCard.$card = this.globals.getCardByRef(deckCard.ref);
    });
    $game.player2.deck.forEach((deckCard: IGameCard) => {
      deckCard.$card = this.globals.getCardByRef(deckCard.ref);
    });
    $game.$turn = $game.phase < 100 ? 1 : 2;
    return $game;
  };

  // Stripe out the game extended values to get the raw DB version
  public decorateGameOut = ($game: IGame): IGame => {
    const game = <IGame>$game.dCopy();
    delete game.$playerMe;
    delete game.$playerOp;
    game.player1.deck.forEach((deckCard: IGameCard) => { delete deckCard.$card; });
    game.player2.deck.forEach((deckCard: IGameCard) => { delete deckCard.$card; });
    delete game.player1.$numPlayer;
    delete game.player2.$numPlayer;
    console.log('Update GAME', game);
    return game;
  };

}
