import { Card, User, UserCard, UserDeck, IGame, IUserGame } from 'src/typings';
import { Component, OnInit } from '@angular/core';
import { AngularFirestore, AngularFirestoreCollection, AngularFirestoreDocument } from '@angular/fire/firestore';
import { Globals } from 'src/app/globals/globals.service';
import { GameService } from 'src/app/globals/game.service';
import * as RxOp from 'rxjs/operators';
import { Observable } from 'rxjs';


interface IUserGameExt extends IUserGame {
  userName$: Observable<string>;
}

@Component({
  selector: 'app-game',
  templateUrl: './game.component.html',
  styleUrls: ['./game.component.scss']
})
export class GameComponent implements OnInit {
  public userA: IUserGameExt;
  public userB: IUserGameExt;
  public game;
  public viewCard;  // Selected card to display on the big image
  public handA; // Turn this into pipe from game obs
  public playA; // Turn this into pipe from game obs
  public handB;
  public playB;

  public isYourHandExp = true;  // Your hand box is expanded
  public isHisHandExp = true;   // Your hand box is expanded

  constructor(
    private globals: Globals,
    private gameSrv: GameService,
    private afs: AngularFirestore,
  ) {

  }

  ngOnInit() {
    this.globals.isGameMode = true;
    this.globals.collapseBars(true);

    const subs = this.gameSrv.gameDoc.snapshotChanges().subscribe(state => {
      subs.unsubscribe();
      const data = state.payload.data();
      console.log(data);
      this.userA = <IUserGameExt> data.user_a.keyMap('life, phase, ready');
      // this.userA.userName$ = this.afs.doc<User>(data.user_a.user_id.path).valueChanges().pipe(RxOp.map((u: User) => u.name));

      // this.userA.user$ = data.user_a.user_id.valueChanges();
      // this.userA.user_id.valueChanges().pipe()
      // this.userB = data.user_b;
    });

    this.createNewGame();
  }

  public createNewGame = () => {
    this.gameSrv.createNewGame().then((game) => {
      
      
      // this.game.userA.deck.filter(c => c.order > 9 && c.order <= 15).forEach(c => {
        //   c.loc = 'play';
        //   c.posX = ((c.order - 8) * 100) + 10; c.posY = 10;
        // });
        // this.playA = this.game.userA.deck.filter(dCard => dCard.loc === 'play');
        
      this.gameSrv.runEngine();
      this.updateView();
      this.viewCard = this.handA[0];
    });
  }

  // Update view elements after running engine
  public updateView = () => {
    this.game = this.gameSrv.state;
    this.handA = this.game.userA.deck.filter(dCard => dCard.loc === 'hand');
    this.handB = this.game.userB.deck.filter(dCard => dCard.loc === 'hand');
    this.playA = this.game.userA.deck.filter(dCard => dCard.loc === 'play').sort((a, b) => a.playOrder > b.playOrder ? 1 : -1);
    this.playB = this.game.userB.deck.filter(dCard => dCard.loc === 'play');
    console.log('USER A DECK', this.game.userA.deck);
  }

  public clickHandCard = (selCard) => {
    console.log(selCard);
    this.gameSrv.summonCard(this.game.userA, selCard);
    this.updateView();
  }

  public tapCard = (selCard) => {
    console.log(selCard);
    this.gameSrv.tapCard(this.game.userA, selCard);
    this.updateView();
  }

  public finishPhase = () => {
    this.gameSrv.runEngine();
    this.updateView();
  }

}
