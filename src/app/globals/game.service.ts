import {Card, User, DeckCard, UserDeck, IGame, IGameCard} from 'src/typings';
import './prototypes';
import { Injectable } from '@angular/core';
import { AngularFirestore, AngularFirestoreCollection, AngularFirestoreDocument } from '@angular/fire/firestore';
import { Observable, BehaviorSubject } from 'rxjs';
import { Globals } from './globals.service';
import * as RxOp from 'rxjs/operators';
import { stringify } from 'querystring';
import { BfGrowlService, BfConfirmService } from 'bf-ui-lib';
import { HttpClient, HttpHeaders } from '@angular/common/http';

const httpOptions = {
  headers: new HttpHeaders({ 'Content-Type':  'application/json' })
};

@Injectable({
 providedIn: 'root'
})
export class GameService {
  public status = 0;    // 0 = off, 1 = ongoing

  public gameId: string;
  public state: IGame;

  //  'https://us-central1-jb-mtg.cloudfunctions.net';
  public readonly baseUrl = 'http://localhost:5000/jb-mtg/us-central1';


  public status$;

  public gameDoc: AngularFirestoreDocument<IGame>;
  public gamesCollection: AngularFirestoreCollection<IGame>;

  public turnState;
  public phaseState;

  constructor(
    private afs: AngularFirestore,
    private globals: Globals,
    private growl: BfGrowlService,
    private http: HttpClient,
  ) {
  }


  // This logic should go to the backend later
  public createNewGame = async () => {
    const user1 = 'zJa8V4puqphDwIl8bvjNQcaDvwF2'; // Joel
    const deck1 = 'k6NYK31X4RuMoAP0BUaE';         // Red Fire
    const user2 = 'B2smfxAYD7X1Y4DZth4S5nMv0uC2'; // Bob
    const deck2 = 'aM0wbWZ26iUow9bSetMF';         // Super Black
    const url = `${this.baseUrl}/newGameApi?user1=${user1}&deck1=${deck1}&user2=${user2}&deck2=${deck2}`;
    this.http.post(url, {}, httpOptions).subscribe((data: any) => {
      console.log('GAME Created!', data.response);
    });
  }


  // This logic should go to the backend later
  public resetGame = () => {
    const url = `${this.baseUrl}/resetGameApi?gameId=${this.gameId}`;
    this.http.post(url, {}, httpOptions).subscribe((data: any) => {
      this.growl.success('Game reset!');
    });
  }



  public summonCard = (selCard: IGameCard) => {
    const payload = {
      gameId: this.gameId,
      userId: this.state.$userA.userId,
      action: 'cast',
      cardRef: selCard.ref,
    };
    const url = `${this.baseUrl}/gameActionApi`;
    this.http.post(url, payload, httpOptions).subscribe((data: any) => {
      console.log('Action acknowledged', data.response);
      // selCard.posX = (totalPlay * 100) + 10;
      // selCard.posY = 50;
      this.growl.success(`${selCard.$card.name} summoned`);
    });
  }







  // ------ All here below should go to the server ------------


  public summonCardSrv = (user, selCard) => {
    if (selCard.loc !== 'hand') {
      return false;
    }
    const totalPlay = user.deck.filter(dCard => dCard.loc === 'play').length;

    // Summon Land
    if (selCard.card.type === 'land') {
      if (this.turnState.summonedLands > 0) {
        this.growl.error('You shall not summon more than one land per turn');
        return false;
      }
      selCard.loc = 'play';
      selCard.playOrder = totalPlay;
      this.turnState.summonedLands++;
      selCard.posX = (totalPlay * 100) + 10;
      selCard.posY = 50;
      this.growl.success(`${selCard.card.name} summoned`);
    }

    // Summon Creature
    if (selCard.card.type === 'creature') {
      if (!this.takeMana(user.manaPool, selCard.card.cast)) {
        this.growl.error(`Not enough mana to summon ${selCard.card.name}`);
        return false;
      }
      selCard.loc = 'play';
      selCard.playOrder = totalPlay;
      selCard.summoningSickness = true;
      selCard.posX = (totalPlay * 100) + 10;
      selCard.posY = 50;
      this.growl.success(`${selCard.card.name} summoned`);
    }
  }

  public tapCard = (user, selCard) => {
    if (selCard.loc === 'play' && selCard.card.type === 'land' && !selCard.isTap) {
      selCard.isTap = true;
      if (selCard.id === 'c4') { user.manaPool[4]++; }  // Mountain
    }
  }

  // From a given mana pool, substract the cast.
  // If possible return true. If not possible, do not substract anything and return false
  public takeMana = (manaPool, cast, clCast?): boolean => {
    const pool = manaPool.copy();
    pool[1] -= cast[1];
    pool[2] -= cast[2];
    pool[3] -= cast[3];
    pool[4] -= cast[4];
    pool[5] -= cast[5];

    let cMana = cast[0];
    if (!clCast) {
      // Try to take the colorless mana from wherever is possible
      if (cMana <= pool[0]) { pool[0] -= cMana; cMana = 0; } else { pool[0] = 0; cMana -= pool[0]; }
      if (cMana <= pool[1]) { pool[1] -= cMana; cMana = 0; } else { pool[1] = 0; cMana -= pool[1]; }
      if (cMana <= pool[2]) { pool[2] -= cMana; cMana = 0; } else { pool[2] = 0; cMana -= pool[2]; }
      if (cMana <= pool[3]) { pool[3] -= cMana; cMana = 0; } else { pool[3] = 0; cMana -= pool[3]; }
      if (cMana <= pool[4]) { pool[4] -= cMana; cMana = 0; } else { pool[4] = 0; cMana -= pool[4]; }
      if (cMana <= pool[5]) { pool[5] -= cMana; cMana = 0; } else { pool[5] = 0; cMana -= pool[5]; }
    }

    if (cMana > 0 || pool.some(mana => mana < 0)) {
      return false; // No enough mana to cast
    } else {
      for (let i = 0; i <= 5; i++) { manaPool[i] = pool[i]; }
      return true;
    }
  }

  // Returns the next phase code
  public getNextPhase = (currPhase: number) => {
    switch (currPhase) {
      case 10: return 20;
      case 20: return 30;
      case 30: return 40;
      case 40: return 50;
      case 50: return 60;
      case 60: return 70;
      case 70: return 80;
      case 80: return 110;
      case 110: return 120;
      case 120: return 130;
      case 130: return 140;
      case 140: return 150;
      case 150: return 160;
      case 160: return 170;
      case 170: return 180;
      case 180: return 10;
      default: return this.state.phase;
    }
  }


  public runEngine = (finishPhase = false) => {
    this.state.status = 0; // running

    // If you have to finish the current phase, jump to the next one
    if (finishPhase) { this.state.phase = this.getNextPhase(this.state.phase); }


    while (this.state.status === 0) {
      let nextPhase = this.state.phase;
      this.phaseState = {};

      // Init turn state
      if (this.state.phase === 10 || this.state.phase === 110) {
        this.turnState = {
          summonedLands: 0
        };
      }

      // 10=untap, 20=maintenance, 30=draw, 40=pre-combat, 50=combat, 60=post-combat, 70=discard, 80=end

      // -------------------------------------------
      // Untap all user A cards
      if (this.state.phase === 10) {
        this.state.$userA.deck.filter(dCard => dCard.loc === 'play').forEach(dCard => {
          dCard.isTap = false;
        });
        nextPhase = 20;
      }

      // -------------------------------------------
      // Run maintenance stuff
      if (this.state.phase === 20) {
        nextPhase = 30;
      }

      // -------------------------------------------
      // Draw a card
      if (this.state.phase === 30) {
        const deckCards = this.state.$userA.deck.filter(c => c.loc === 'deck');
        if (!deckCards.length) {
          // No cards to draw, user A loses the game :(
          console.error('USER A is dead ------------------------------- No more cards in the deck');

        } else {
          deckCards[0].loc = 'hand';
          console.log('Drawing new card --->', deckCards[0]);
        }
        nextPhase = 40;
      }

      // -------------------------------------------
      // Before pre-combat
      if (this.state.phase === 40) {
        this.state.status = 1;  // Wait for the user to do what he needs
      }

      // -------------------------------------------
      // Combat
      if (this.state.phase === 50) {
        if (this.state.$userA.deck.filter(c => c.loc === 'play' && c.$card.type === 'creature').length) {
          this.state.status = 1;  // Wait for the user to do what he needs
        } else {
          // If no creatures in play, skip combat and after-combat phase
          nextPhase = 70;
        }
      }

      // -------------------------------------------
      // After pre-combat
      if (this.state.phase === 60) {
        this.state.status = 1;  // Wait for the user to do what he needs
      }

      // -------------------------------------------
      //  Discard
      if (this.state.phase === 70) {
        nextPhase = 80;
        if (this.state.$userA.deck.filter(dCard => dCard.loc === 'hand').length > 7) {
          this.state.status = 2;  // Open select cards to discard modal
        }
      }

      // -------------------------------------------
      //  End (mana burn)
      if (this.state.phase === 80) {
        const manaLeft = this.state.$userA.manaPool[0] + this.state.$userA.manaPool[1] + this.state.$userA.manaPool[2]
                       + this.state.$userA.manaPool[3] + this.state.$userA.manaPool[4] + this.state.$userA.manaPool[5];
        if (manaLeft > 0) {
          this.state.$userA.life = this.state.$userA.life - manaLeft;
          this.state.$userA.manaPool = [0, 0, 0, 0, 0, 0];
          this.growl.error(`Mana Burn: The ${manaLeft} mana left on your mana pool damaged you`);
        }
        nextPhase = 110;
      }




      // -------------------------------------------
      // Untap all user A cards
      if (this.state.phase === 110) {
        // Untap all user B cards
        nextPhase = 10;
      }

      this.state.phase = nextPhase;
    }
  }


}
