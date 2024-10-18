import { Component, ViewEncapsulation } from '@angular/core';
import { AuthService } from '../../core/common/auth.service';
import { ShellService } from '../../shell/shell.service';
import { CommonModule } from '@angular/common';
import { Firestore, QuerySnapshot, QueryDocumentSnapshot, DocumentData } from '@angular/fire/firestore';
import { getDocs, getDoc, collection, doc } from '@angular/fire/firestore';
import { Observable } from 'rxjs';
import { collectionData } from 'rxfire/firestore';
import { TCard } from '../../core/types';

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

  constructor(
    public auth: AuthService,
    public shell: ShellService,
    public firestore: Firestore,
  ) {

  }

  async ngOnInit() {
    const allDocs: QuerySnapshot<DocumentData> = await getDocs(collection(this.firestore, 'cards'));
    allDocs.forEach((doc: QueryDocumentSnapshot<DocumentData>) => this.cards.push({ id: doc.id, ...doc.data() } as TCard));
  }

}
