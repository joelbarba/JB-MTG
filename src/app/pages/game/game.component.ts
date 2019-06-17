import { Card, User, UserCard, UserDeck, IGame, IUserGame } from 'src/typings';
import { Component, OnInit } from '@angular/core';
import { AngularFirestore, AngularFirestoreCollection, AngularFirestoreDocument } from '@angular/fire/firestore';
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

  constructor(
    private game: GameService,
    private afs: AngularFirestore,
  ) {

  }

  ngOnInit() {

    const subs = this.game.gameDoc.snapshotChanges().subscribe(state => {
      subs.unsubscribe();
      const data = state.payload.data();
      console.log(data);
      this.userA = <IUserGameExt> data.user_a.keyMap('life, phase, ready');
      // this.userA.userName$ = this.afs.doc<User>(data.user_a.user_id.path).valueChanges().pipe(RxOp.map((u: User) => u.name));

      // this.userA.user$ = data.user_a.user_id.valueChanges();
      // this.userA.user_id.valueChanges().pipe()
      // this.userB = data.user_b;
    });

  }



}
