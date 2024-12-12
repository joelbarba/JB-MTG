import { Component } from '@angular/core';
import { Firestore, QuerySnapshot, Unsubscribe, addDoc, collection, collectionData, deleteDoc, doc, onSnapshot, setDoc } from '@angular/fire/firestore';
import { AuthService } from '../../core/common/auth.service';
import { ShellService } from '../../shell/shell.service';
import { CommonModule } from '@angular/common';
import { Observable } from 'rxjs';
import { EPhase, TCast, TGameCard, TGameDBState, TGameState, TPlayer } from '../../core/types';
import { Router } from '@angular/router';
import { GameStateService } from './game-state.service';
import { TranslateModule } from '@ngx-translate/core';
import { FormsModule } from '@angular/forms';
import { BfGrowlService, BfListHandler, BfUiLibModule } from 'bf-ui-lib';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { NewGameModalComponent } from './new-game-modal/new-game-modal.component';
import { DataService } from '../../core/dataService';

type TGamePlayStatus = 'requesting' | 'requested' | 'ongoing' | 'won' | 'lost';
type TGameExt = TGameDBState & {
  gameId        : string, 
  op            : TGamePlayStatus, 
  desc          : string, 
  youArePlayer1 : boolean, 
  deckName      : string, 
  ind           : string 
};

@Component({
  selector: 'app-games-room',
  standalone: true,
  imports: [
    CommonModule,
    TranslateModule,
    FormsModule,
    BfUiLibModule,
  ],
  templateUrl: './games-room.component.html',
  styleUrl: './games-room.component.scss'
})
export class GamesRoomComponent {
  gamesSub!: Unsubscribe;

  filters = {
    requesting: true,
    requested: true,
    ongoing: true,
    archived: false,
  };

  gamesList!: BfListHandler;
  isAdmin = false;

  constructor(
    public auth: AuthService,
    public router: Router,
    public shell: ShellService,
    public firestore: Firestore,
    public gameState: GameStateService,
    private ngbModal: NgbModal,
    private dataService: DataService,
    private growl: BfGrowlService,
  ) {
    this.shell.gameMode('off');
    this.gamesList = new BfListHandler({
      listName      : 'games-list',
      orderFields   : ['ind'],
      orderReverse  : true,
      rowsPerPage   : 15,
    });
  }

  games!: Array<TGameExt>;

  async ngOnInit() {
    await this.auth.profilePromise;
    await this.dataService.yourDecksPromise;
    this.isAdmin = !!this.auth.profile?.isAdmin;

    this.gamesSub = onSnapshot(collection(this.firestore, 'games'), (snapshot: QuerySnapshot) => {
      this.games = snapshot.docs.map(doc => {
        const game = { ...doc.data() } as TGameDBState;
        const gameId = doc.id;
        let desc = 'This game has already started';
        let op: TGamePlayStatus = 'ongoing';
        const timeOrder = (num: number) => (num + '-' + (new Date(game.created)).getTime()).padEnd(15, '0');
        let ind = timeOrder(3);
        const youArePlayer1 = game.player1.userId === this.auth.profileUserId;
        const deckName = this.dataService.yourDecks.find(d => d.id === (youArePlayer1 ? game.deckId1 : game.deckId2))?.deckName || '';

        if (game.status === 'created' && !game.deckId2) {
          if (!youArePlayer1) {            
            ind = timeOrder(5); op = 'requested'; desc = `${game.player1.name} wants to play against you`; 
          } else {
            ind = timeOrder(4); op = 'requesting'; desc = `Awaiting ${game.player2.name} to answer the game request you sent`;
          }
        } else {
          if ((game.status === 'player1win' && youArePlayer1) || (game.status === 'player2win' && !youArePlayer1)) {
            ind = timeOrder(2); op = 'won'; desc = `The game is over. You won that game.`;
          }
          if ((game.status === 'player1win' && !youArePlayer1) || (game.status === 'player2win' && youArePlayer1)) {
            ind = timeOrder(1); op = 'lost'; desc = `The game is over. You lost that game.`;
          }
        }

        return { ...game, gameId, op, desc, youArePlayer1, deckName, ind };
      });      
      this.filterGames();
    });
  }

  filterGames() {
    this.gamesList.load(this.games.filter(game => {
      if (game.op === 'requested'  && !this.filters.requested) { return false; }
      if (game.op === 'requesting' && !this.filters.requesting) { return false; }
      if (game.op === 'ongoing'    && !this.filters.ongoing) { return false; }
      if ((game.op === 'won' || game.op === 'lost') && !this.filters.archived) { return false; }
      return true;
    }));
  }

  ngOnDestroy() {
    this.gamesList.destroy();
    this.gamesSub();
    // this.subs.forEach(sub => sub.unsubscribe())
  }


  goToGame(gameId: string) {
    this.router.navigate(['game/', gameId]);
  }

  openNewGameModal() {
    const modalRef = this.ngbModal.open(NewGameModalComponent, { backdrop: 'static', centered: false, size: 'lg' });
    modalRef.result.then(data => {});
  }

  withdrawRequest(game: TGameExt) {
    this.deleteGame(game.gameId);
  }

  acceptGameRequest(game: TGameExt) {
    const modalRef = this.ngbModal.open(NewGameModalComponent, { backdrop: 'static', centered: false, size: 'lg' });
    modalRef.componentInstance.gameId = game.gameId;
    modalRef.componentInstance.playerName = game.player1.name;
    modalRef.result.then(data => {
      if (data) {
        this.goToGame(game.gameId);
      }
    });
  }

  async resetGame(gameId: string) {
    // const newGame = this.generateGame();
    // await setDoc(doc(this.firestore, 'games', gameId), newGame);
    // this.goToGame(gameId);
  }

  async deleteGame(gameId: string) {
    await deleteDoc(doc(this.firestore, 'games', gameId));
    await deleteDoc(doc(this.firestore, 'gamesChat', gameId));
    await deleteDoc(doc(this.firestore, 'gamesHistory', gameId));
    this.growl.success('Game Deleted');
  }


}
