import { Component } from '@angular/core';
import { Firestore, addDoc, collection, collectionData, deleteDoc, doc, setDoc } from '@angular/fire/firestore';
import { AuthService } from '../../core/common/auth.service';
import { ShellService } from '../../shell/shell.service';
import { CommonModule } from '@angular/common';
import { Observable } from 'rxjs';
import { EPhase, TCast, TGameCard, TGameDBState, TGameState, TPlayer } from '../../core/types';
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
  games$ = collectionData(this.gamesCol, { idField: 'id'}) as Observable<Array<TGameDBState & { id: string }>>;

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

  async createNewGame() {
    const newGame = this.generateGame();
    const docRef = await addDoc(collection(this.firestore, 'games'), newGame);
    await setDoc(doc(this.firestore, 'gamesHistory', docRef.id), newGame);

    console.log('New Game Created', newGame);
    this.goToGame(docRef.id);
  }

  async resetGame(gameId: string) {
    const newGame = this.generateGame();
    await setDoc(doc(this.firestore, 'games', gameId), newGame);
    // this.goToGame(gameId);
  }
  async deleteGame(gameId: string) {
    await deleteDoc(doc(this.firestore, 'games', gameId));
    // this.goToGame(gameId);
  }

  generateGame() {
    const getCardById = (id: string): TGameCard => this.gameState.library.find(c => c.id === id) as TGameCard;
    const generateId = (ind: number) => 'g' + (ind + '').padStart(3, '000');
    const generateOrder = () => Math.round(Math.random() * 9999);
    const defaultCardFields = (playerNum: string, order: number) => {      
      return {
        gId: '',
        order, // : generateOrder(), 
        location: 'deck' + playerNum, 
        owner: playerNum, 
        controller: playerNum, 
        isTapped: false,
        status: null,
        targets: [],
        possibleTargets: [],
        neededTargets: 0,
        turnDamage: 0,
        turnAttack: 0,
        turnDefense: 0,
      };
    }

    const deck1 = [
      getCardById('c000004'), // Mountain
      getCardById('c000005'), // Forest
      getCardById('c000003'), // Swamp
      getCardById('c000003'), // Swamp
      getCardById('c000002'), // Plains
      getCardById('c000052'), // Mons's Goblin Raiders (1/1)
      getCardById('c000032'), // Lightning Bolt
      getCardById('c000043'), // Gian Growth
      getCardById('c000001'), // Island
      getCardById('c000001'), // Island
      getCardById('c000038'), // Counter Spell
      getCardById('c000038'), // Counter Spell
      getCardById('c000028'), // Drudge Skeletons
      getCardById('c000025'), // Bad Moon
      getCardById('c000055'), // Unholy Strength
      getCardById('c000057'), // Disenchantment
      getCardById('c000055'), // Unholy Strength
      // getCardById('c000055'), // Unholy Strength
      getCardById('c000041'), // Elvish Archers (2/1)
      getCardById('c000025'), // Bad Moon
      getCardById('c000004'), // Mountain
      getCardById('c000005'), // Forest
      getCardById('c000044'), // Giant Spider (2/4)
      getCardById('c000046'), // Granite Gargoyle (2/2)
      getCardById('c000047'), // Grizzly Bears (2/2)
      getCardById('c000048'), // Hill Giant (3/3)
      getCardById('c000049'), // Hurloon Minotaur (2/3)
      getCardById('c000056'), // Wall of Ice (0/7)

      getCardById('c000001'), // Island
      getCardById('c000001'), // Island
      getCardById('c000001'), // Island
      getCardById('c000038'), // Counter Spell
      getCardById('c000038'), // Counter Spell
      getCardById('c000038'), // Counter Spell
      getCardById('c000032'), // Lightning Bolt
      getCardById('c000032'), // Lightning Bolt
      getCardById('c000043'), // Gian Growth
      getCardById('c000043'), // Gian Growth
      // getCardById('c0000'), // 
      // getCardById('c0000'), // 
      getCardById('c000053'), // Ornithopter

      getCardById('c000002'), // Plains
      getCardById('c000001'), // Island
      getCardById('c000037'), // Brass Man (1/3)
      getCardById('c000045'), // Goblin Balloon Brigade (1/1)
      getCardById('c000052'), // Mons's Goblin Raiders (1/1)
      getCardById('c000004'), // mountain
      getCardById('c000004'), // mountain
      getCardById('c000004'), // mountain
      getCardById('c000004'), // mountain
      getCardById('c000004'), // mountain
      getCardById('c000032'), // lightning bolt
      getCardById('c000032'), // lightning bolt
      getCardById('c000032'), // lightning bolt
      getCardById('c000002'), // plains
      getCardById('c000002'), // plains
      getCardById('c000002'), // plains
      getCardById('c000001'), // island
      getCardById('c000001'), // island
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
    ].map((card, ind) => ({ ...card, ...defaultCardFields('1', ind) }))
     .sort((a, b) => a.order > b.order ? 1 : -1);     

    const deck2 = [
      getCardById('c000004'), // Mountain
      getCardById('c000005'), // Forest
      getCardById('c000003'), // Swamp
      getCardById('c000003'), // Swamp
      getCardById('c000002'), // Plains
      getCardById('c000041'), // Elvish Archers (2/1)
      getCardById('c000043'), // Gian Growth
      getCardById('c000028'), // Drudge Skeletons
      getCardById('c000001'), // Island
      getCardById('c000001'), // Island
      getCardById('c000038'), // Counter Spell
      getCardById('c000038'), // Counter Spell
      getCardById('c000038'), // Counter Spell
      getCardById('c000025'), // Bad Moon
      getCardById('c000055'), // Unholy Strength
      getCardById('c000057'), // Disenchantment
      getCardById('c000055'), // Unholy Strength
      // getCardById('c000055'), // Unholy Strength
      getCardById('c000057'), // Disenchantment
      getCardById('c000057'), // Disenchantment
      getCardById('c000041'), // Elvish Archers (2/1)
      getCardById('c000025'), // Bad Moon
      getCardById('c000004'), // Mountain
      getCardById('c000005'), // Forest
      getCardById('c000044'), // Giant Spider (2/4)
      getCardById('c000046'), // Granite Gargoyle (2/2)
      getCardById('c000047'), // Grizzly Bears (2/2)
      getCardById('c000048'), // Hill Giant (3/3)
      getCardById('c000049'), // Hurloon Minotaur (2/3)
      getCardById('c000056'), // Wall of Ice (0/7)

      getCardById('c000052'), // Mons's Goblin Raiders (1/1)
      getCardById('c000005'), // forest
      getCardById('c000005'), // forest
      getCardById('c000032'), // Lightning Bolt
      getCardById('c000043'), // Gian Growth
      getCardById('c000001'), // Island
      getCardById('c000001'), // Island

      getCardById('c000032'), // Lightning Bolt
      getCardById('c000032'), // Lightning Bolt
      getCardById('c000043'), // Gian Growth
      getCardById('c000043'), // Gian Growth
      // getCardById('c0000'), // 
      // getCardById('c0000'), //      
      getCardById('c000053'), // Ornithopter
      getCardById('c000041'), // Elvish Archers (2/1)
      getCardById('c000004'), // mountain
      getCardById('c000004'), // mountain
      getCardById('c000002'), // plains
      getCardById('c000001'), // island
      getCardById('c000005'), // forest
      getCardById('c000005'), // forest
      getCardById('c000036'), // gray ogre (2/2)
      getCardById('c000037'), // Brass Man (1/3)
      getCardById('c000045'), // Goblin Balloon Brigade (1/1)
      getCardById('c000052'), // Mons's Goblin Raiders (1/1)
      getCardById('c000041'), // Elvish Archers (2/1)
      getCardById('c000044'), // Giant Spider (2/4)
      getCardById('c000046'), // Granite Gargoyle (2/2)
      getCardById('c000047'), // Grizzly Bears (2/2)
      getCardById('c000048'), // Hill Giant (3/3)
      getCardById('c000049'), // Hurloon Minotaur (2/3)
      getCardById('c000056'), // Wall of Ice (0/7)
      getCardById('c000004'), // mountain
      getCardById('c000004'), // mountain
      getCardById('c000004'), // mountain
      getCardById('c000004'), // mountain
      getCardById('c000004'), // mountain
      getCardById('c000032'), // lightning bolt
      getCardById('c000032'), // lightning bolt
      getCardById('c000032'), // lightning bolt
      getCardById('c000036'), // gray ogre
      getCardById('c000036'), // gray ogre
      getCardById('c000036'), // gray ogre
      getCardById('c000032'), // lightning bolt
      getCardById('c000032'), // lightning bolt
      getCardById('c000032'), // lightning bolt
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
    ].map((card, ind) => ({ ...card, ...defaultCardFields('2', ind) }))
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
      manaPool: [0,0,0,0,0,0] as TCast,
      drawnCards: 0,
      summonedLands: 0,
      stackCall: false,      
    };
    
    const playerYou = { userId: this.auth.profileUserId, name: this.auth.profileUserName, ...defaultPlayerValues };
    const playerOther = { userId: 'BhyW7MAVP4Xi5fojf3hF7T58tem2', name: 'Bob', ...defaultPlayerValues };
    if (playerYou.userId === 'BhyW7MAVP4Xi5fojf3hF7T58tem2') { // If you are Bob, set Alice as the other
      playerOther.userId = '4cix25Z3DPNgcTFy4FcsYmXjdSi1';
      playerOther.name = 'Alice'
    }
    
    // Randomly set who is player 1 or player 2
    let player1 = { ...playerYou,   num: '1' } as TPlayer;
    let player2 = { ...playerOther, num: '2' } as TPlayer;
    // if (Math.random() * 2 >= 0.5) {
    //   player1 = { ...playerOther, num: '1' } as TPlayer;
    //   player2 = { ...playerYou,   num: '2' } as TPlayer;
    // }    

    const newGame: TGameDBState = {
      created: new Date() + '',
      status: 'created',
      turn: '1',
      phase: EPhase.untap,
      subPhase: null,
      player1,
      player2,
      cards,
      effects: [],
      control: '1', // Player1 starts
      id: 0,
    };

    return newGame;
  }

}
