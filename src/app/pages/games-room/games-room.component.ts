import { Component } from '@angular/core';
import { Firestore, addDoc, collection, collectionData, doc, setDoc } from '@angular/fire/firestore';
import { AuthService } from '../../core/common/auth.service';
import { ShellService } from '../../shell/shell.service';
import { CommonModule } from '@angular/common';
import { Observable } from 'rxjs';
import { EPhase, TGameCard, TGameState, TPlayer } from '../../core/types';
import { Router } from '@angular/router';
import { GameStateService } from './game-state.service';

@Component({
  selector: 'app-games-room',
  standalone: true,
  imports: [
    CommonModule,
  ],
  templateUrl: './games-room.component.html',
  styleUrl: './games-room.component.scss'
})
export class GamesRoomComponent {
  gamesCol = collection(this.firestore, 'games');
  games$ = collectionData(this.gamesCol, { idField: 'id'}) as Observable<Array<TGameState & { id: string }>>;

  constructor(
    public auth: AuthService,
    public router: Router,
    public shell: ShellService,
    public firestore: Firestore,
    public gameState: GameStateService,
  ) {
    // this.games$.subscribe(g => console.log(g));
  }

  goToGame(gameId: string) {
    this.router.navigate(['game/', gameId]);
    // this.gameState.startGame(gameId);
  }

  createNewGame() {
    const newGame = this.generateGame();
    addDoc(collection(this.firestore, 'games'), newGame).then(docRef => {
      console.log('New Game Created', newGame);
      this.goToGame(docRef.id);
    });
  }

  async resetGame(gameId: string) {
    const newGame = this.generateGame();
    await setDoc(doc(this.firestore, 'games', gameId), newGame);
    // this.goToGame(gameId);
  }

  generateGame() {
    const getCardById = (id: string): TGameCard => this.gameState.library.find(c => c.id === id) as TGameCard;
    const generateId = (ind: number) => 'g' + (ind + '').padStart(3, '000');
    const generateOrder = () => Math.round(Math.random() * 9999);
    const defaultCardFields = (playerNum: string) => {      
      return {
        gId: '',
        order: generateOrder(), 
        location: 'deck' + playerNum, 
        owner: playerNum, 
        controller: playerNum, 
        // posX: 100, posY: 30, zInd: 100,
        isTapped: false, isSelectable: false,
        summonStatus: null,
        selectableAction: null,
      };
    }

    const deck1 = [
      getCardById('c000004'), // mountain
      getCardById('c000004'), // mountain
      getCardById('c000004'), // mountain
      getCardById('c000004'), // mountain
      getCardById('c000004'), // mountain
      getCardById('c000002'), // plains
      getCardById('c000002'), // plains
      getCardById('c000002'), // plains
      getCardById('c000002'), // plains
      getCardById('c000001'), // island
      getCardById('c000001'), // island
      getCardById('c000001'), // island
      getCardById('c000003'), // swamp
      getCardById('c000003'), // swamp
      getCardById('c000003'), // swamp
      getCardById('c000005'), // forest
      getCardById('c000005'), // forest
      getCardById('c000005'), // forest
      getCardById('c000036'), // gray ogre
      getCardById('c000036'), // gray ogre
      getCardById('c000036'), // gray ogre
      getCardById('c000036'), // gray ogre
      getCardById('c000036'), // gray ogre
      getCardById('c000036'), // gray ogre
      getCardById('c000032'), // lightning bolt
      getCardById('c000032'), // lightning bolt
      getCardById('c000032'), // lightning bolt
      getCardById('c000032'), // lightning bolt
      getCardById('c000032'), // lightning bolt
    ].map((card, ind) => ({ ...card, ...defaultCardFields('1') }))
     .sort((a, b) => a.order > b.order ? 1 : -1);     

    const deck2 = [
      getCardById('c000004'), // mountain
      getCardById('c000004'), // mountain
      getCardById('c000004'), // mountain
      getCardById('c000004'), // mountain
      getCardById('c000004'), // mountain
      getCardById('c000002'), // plains
      getCardById('c000002'), // plains
      getCardById('c000002'), // plains
      getCardById('c000002'), // plains
      getCardById('c000001'), // island
      getCardById('c000001'), // island
      getCardById('c000001'), // island
      getCardById('c000003'), // swamp
      getCardById('c000003'), // swamp
      getCardById('c000003'), // swamp
      getCardById('c000005'), // forest
      getCardById('c000005'), // forest
      getCardById('c000005'), // forest
      getCardById('c000036'), // gray ogre
      getCardById('c000036'), // gray ogre
      getCardById('c000036'), // gray ogre
      getCardById('c000036'), // gray ogre
      getCardById('c000036'), // gray ogre
      getCardById('c000036'), // gray ogre
      getCardById('c000032'), // lightning bolt
      getCardById('c000032'), // lightning bolt
      getCardById('c000032'), // lightning bolt
      getCardById('c000032'), // lightning bolt
      getCardById('c000032'), // lightning bolt
    ].map((card, ind) => ({ ...card, ...defaultCardFields('2') }))
     .sort((a, b) => a.order > b.order ? 1 : -1);

    deck1.forEach((c, ind) => c.order = ind);
    deck2.forEach((c, ind) => c.order = ind);

    const cards = deck1.concat(deck2) as Array<TGameCard>;
    cards.forEach((c, ind) => c.gId = generateId(ind)); // Generate unique identifiers on the game

    cards.filter(c => c.owner === '1' && c.order < 7).forEach(c => c.location = 'hand1');
    cards.filter(c => c.owner === '2' && c.order < 7).forEach(c => c.location = 'hand2');

    console.log('YOU ARE:', this.auth.profileUserName, this.auth.profileUserId);

    
    const defaultPlayerValues = {
      help: '',
      life: 20,
      manaPool: [0,0,0,0,0,0],
      drawnCards: 0,
      summonedLands: 0,
    };
    
    const playerYou = { userId: this.auth.profileUserId, name: this.auth.profileUserName, ...defaultPlayerValues } as TPlayer;
    const playerOther = { userId: 'BhyW7MAVP4Xi5fojf3hF7T58tem2', name: 'Bob', ...defaultPlayerValues } as TPlayer;
    if (playerYou.userId === 'BhyW7MAVP4Xi5fojf3hF7T58tem2') { // If you are Bob, set Alice as the other
      playerOther.userId = '4cix25Z3DPNgcTFy4FcsYmXjdSi1';
      playerOther.name = 'Alice'
    }
    
    // Randomly set who is player 1 or player 2
    let player1 = playerYou;
    let player2 = playerOther;
    // if (Math.random() * 2 >= 0.5) {
    //   player1 = playerOther;
    //   player2 = playerYou;
    // }

    const newGame: TGameState = {
      created: new Date() + '',
      status: 'created',
      turn: '1',
      phase: EPhase.untap,
      player1,
      player2,
      cards,
      options: [{ player: '1', action: 'start-game' }],
    };

    return newGame;
  }

}
