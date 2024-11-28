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
import { ManaArrayComponent } from "../games-room/game/mana-array/mana-array.component";
import { MtgCardComponent } from '../../core/common/internal-lib/mtg-card/mtg-card.component';



@Component({
  selector: 'app-library',
  standalone: true,
  imports: [
    CommonModule,
    TranslateModule,
    FormsModule,
    BfUiLibModule,
    MtgCardComponent,
],
  templateUrl: './library.component.html',
  styleUrl: './library.component.scss',
  encapsulation: ViewEncapsulation.None,
})
export class LibraryComponent {
  
  hoverCard: TCard | null = null;
  selectedCard: TCard | null = null;
  cards: Array<TCard> = [];

  constructor(
    private shell: ShellService,
    private auth: AuthService,
    public firestore: Firestore,
  ) {
    this.shell.gameMode('off');
  }

  async ngOnInit() {
    const allDocs: QuerySnapshot<DocumentData> = await getDocs(collection(this.firestore, 'cards'));
    allDocs.forEach((doc: QueryDocumentSnapshot<DocumentData>) => this.cards.push({ id: doc.id, ...doc.data() } as TCard));
    this.cards.sort((a,b) => a.id > b.id ? 1 : -1);
    console.log(this.cards);
  }


  unitsData = {
    total  : 0, // total number of units
    owned  : 0, // total number of units you own
    others : 0, // total number of units someone else owns
    free   : 0, // total number of units nobody owns
  }

  selectCard(card: TCard) {
    this.selectedCard = card;
    console.log(this.selectedCard.units);
    const units = this.selectedCard.units || [];
    this.unitsData = {
      total   : units.length,
      owned   : units.filter(u => u.owner === 'you').length,
      others  : units.filter(u => u.owner !== 'you' && u.owner).length,
      free    : units.filter(u => !u.owner).length,
    };

  }

}
