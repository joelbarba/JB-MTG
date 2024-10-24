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
  cardTypes = [{ value: 'land'}, { value: 'creature'}, { value:  'instant'}, { value:  'artifact'}];

  constructor(
    public auth: AuthService,
    public shell: ShellService,
    public firestore: Firestore,
  ) {

  }

  async ngOnInit() {
    const allDocs: QuerySnapshot<DocumentData> = await getDocs(collection(this.firestore, 'cards'));
    allDocs.forEach((doc: QueryDocumentSnapshot<DocumentData>) => this.cards.push({ id: doc.id, ...doc.data() } as TCard));
    console.log(this.cards);
  }


  async saveCard(card: TCard) {
    card.cast = card.cast.map((v: number | string) => Number.parseInt(v as string, 10)) as TCast;
    const docObj = card.keyFilter('name, image, color, type, attack, defense, cast, text') as Partial<TCard>;
    console.log('Saving Card', docObj);
    await updateDoc(doc(this.firestore, 'cards', card.id), docObj);
    this.isEdit = false;
  }

}
