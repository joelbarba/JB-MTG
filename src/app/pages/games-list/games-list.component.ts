import { ICard, IUser, IUserCard, IDeckCard, UserDeck, IGame } from 'src/typings';
import { Component, OnInit } from '@angular/core';
import {Globals} from '../../core/globals.service';
import {Profile} from '../../core/profile.service';
import {AngularFirestore} from '@angular/fire/firestore';
import {Router} from '@angular/router';
import {BfGrowlService} from '@blueface_npm/bf-ui-lib';
import { map } from 'rxjs/operators';

@Component({
  selector: 'app-games-list',
  templateUrl: './games-list.component.html',
  styleUrls: ['./games-list.component.scss']
})
export class GamesListComponent implements OnInit {
  public gamesCol;
  public games$;

  constructor(
    private globals: Globals,
    private profile: Profile,
    // private gameSrv: GameService,
    private afs: AngularFirestore,
    private router: Router,
    private growl: BfGrowlService,
  ) { }

  async ngOnInit() {
    await this.profile.loadPromise;

    // Fetch user decks
    this.gamesCol = this.afs.collection<IGame>('users/' + this.profile.userId + '/games');
    this.games$ = this.gamesCol.snapshotChanges().pipe(
      map((actions: any) => {
        return actions.map(game => {
          const data = game.payload.doc.data() as IGame;
          const id = game.payload.doc.id;
          return { ...data, id };
        });
      })
    );
  }

  public deleteGame = (game) => {
    this.gamesCol.doc(game.id).delete().then(() => {
      this.growl.success('Game deleted. Id: ' + game.id);
    });
    console.log();
  };

  public loadGame = (game) => {
    this.router.navigate(['/game/' + game.id]);
  };
}
