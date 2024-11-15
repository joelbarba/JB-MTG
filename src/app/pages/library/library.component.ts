import { Component, ViewEncapsulation } from '@angular/core';
import { AuthService } from '../../core/common/auth.service';
import { ShellService } from '../../shell/shell.service';
import { CommonModule } from '@angular/common';
import { Firestore, QuerySnapshot, QueryDocumentSnapshot, DocumentData, setDoc, updateDoc } from '@angular/fire/firestore';
import { getDocs, getDoc, collection, doc } from '@angular/fire/firestore';
import { Observable } from 'rxjs';
import { collectionData } from 'rxfire/firestore';
import { TCard } from '../../core/types';
import { FormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { BfConfirmService, BfUiLibModule } from '@blueface_npm/bf-ui-lib';
import { EPhase, TGameState, TGameCard, TExtGameCard, TPlayer, TAction, TCast } from '../../core/types';

interface Card {
  // Define the structure of a single card document
  id: string;
  title: string;
  description: string;
  // Add other fields as needed
}

@Component({
  selector: 'app-library',
  standalone: true,
  imports: [
    CommonModule,
    TranslateModule,
    FormsModule,
    BfUiLibModule,
  ],
  templateUrl: './library.component.html',
  styleUrl: './library.component.scss',
  encapsulation: ViewEncapsulation.None,
})
export class LibraryComponent {
  
  // cardsCol = collection(this.firestore, 'cards');
  // cards$ = collectionData(this.cardsCol, { idField: 'id' }) as Observable<TCard[]>;
  
  selectedCard: TCard | null = null;
  cards: Array<TCard> = [];

  isEdit = true;

  colors = [
    { value: 'uncolored'}, 
    { value: 'blue'}, 
    { value: 'black'}, 
    { value: 'white'},
    { value: 'red'},
    { value: 'green'},
  ];
  cardTypes = [
    { value: 'land'}, 
    { value: 'creature'}, 
    { value: 'instant'}, 
    { value: 'interruption'}, 
    { value: 'artifact'},
    { value: 'sorcery'},
    { value: 'enchantment'},
  ];

  constructor(
    public auth: AuthService,
    public shell: ShellService,
    public firestore: Firestore,
  ) {

  }

  async ngOnInit() {
    const allDocs: QuerySnapshot<DocumentData> = await getDocs(collection(this.firestore, 'cards'));
    allDocs.forEach((doc: QueryDocumentSnapshot<DocumentData>) => this.cards.push({ id: doc.id, ...doc.data() } as TCard));
    this.cards.sort((a,b) => a.id > b.id ? 1 : -1);
    console.log(this.cards);
  }



  selectCard(card: TCard) {
    this.selectedCard = card;
    this.isEdit = true;
  }

  async saveCard(card: TCard) {
    card.cast = card.cast.map((v: number | string) => Number.parseInt(v as string, 10)) as TCast;
    if (typeof card.attack === 'string') { card.attack = Number.parseInt(card.attack, 10); }
    if (typeof card.defense === 'string') { card.defense = Number.parseInt(card.defense, 10); }

    // if (card.id === 'c000032') { // Lightning Bolt
    //   card.castTargetTypes = [
    //     [{ player: 'A', }, { player: 'B'}, 
    //      { cardType: 'creature', location: 'tble' },
    //      { cardType: 'creature', location: 'stack' },
    //     ]
    //   ];
    // }
    // if (card.id === 'c000043') { // Giant Growth
    //   card.castTargetTypes = [
    //     [{ cardType: 'creature', location: 'tble' },
    //      { cardType: 'creature', location: 'stack' },
    //     ]
    //   ];
    // }

    const docObj = card.keyFilter('name, image, color, type, attack, defense, cast, text, readyToPlay') as Partial<TCard>;
    console.log('Saving Card', docObj);
    await updateDoc(doc(this.firestore, 'cards', card.id), docObj);
    this.isEdit = false;
  }


  async newCard() {
    const lastId = this.cards.at(-1)?.id;
    if (!lastId) { return; }
    const id = 'c' + ((Number.parseInt(lastId.slice(1)) + 1) + '').padStart(6, '0');
    const card: TCard = {
      id,
      name    : 'New Card',
      image   : 'image',
      color   : 'uncolored',
      cast    : [0,0,0,0,0,0],
      text    : '',
      type    : 'land',
      attack  : 0,
      defense : 0,
      readyToPlay: false,
    };
    console.log('New Card:', card);
    await setDoc(doc(this.firestore, 'cards', id), card);
    this.cards.push(card);
    this.selectCard(card);
  }

  numArr(num: number): Array<number> { return Array.from(Array(num).keys()) }
}
