import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { BfUiLibModule } from 'bf-ui-lib';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { BfLang, BfLangList, AppTranslateService } from '../../core/common/app-translate.service';
import { BehaviorSubject, Observable, Subject, map, take } from 'rxjs';
import { Firestore, getDocs, query, collection, collectionData, onSnapshot, where, Unsubscribe, QuerySnapshot } from '@angular/fire/firestore';
import { DataService } from '../../core/dataService';
import { AuthService } from '../../core/common/auth.service';
import { Router } from '@angular/router';
import { TGameDBState } from '../../core/types';


@Component({
  selector: 'app-home',
  standalone: true,
  templateUrl: './home.component.html',
  styleUrl: './home.component.scss',
  imports: [
    CommonModule,
    TranslateModule,
    FormsModule,
    BfUiLibModule,
  ],
})
export class HomeComponent {

  numCards = 0;
  numDecks = 0;
  numRequests = 0;
  numGames = 0;


  gamesSub!: Unsubscribe;

  constructor(
    private translate: TranslateService,
    private appTranslate: AppTranslateService,
    private firestore: Firestore,
    private dataService: DataService,
    private auth: AuthService,
    private router: Router,
  ) {    
  }


  async ngOnInit() {
    await this.dataService.loadPromise;

    this.numCards = this.dataService.cards.reduce((acc, card) => {
      return acc + card.units.filter(u => u.ownerId === this.auth.profileUserId).length;
    }, 0);

    await this.dataService.yourDecksPromise;
    this.numDecks = this.dataService.yourDecks.length;

    this.gamesSub = onSnapshot(collection(this.firestore, 'games'), (snapshot: QuerySnapshot) => {
      const games = snapshot.docs.map(doc => ({ ...doc.data(), gameId: doc.id } as TGameDBState & { gameId: string })).filter(game => {
        if (game.gameId === 'tmpGameState') return false;
        return game.player1.userId === this.auth.profileUserId 
            || game.player2.userId === this.auth.profileUserId;
      });
      this.numRequests = games.filter(g => g.status === 'created').length;
      this.numGames = games.filter(g => g.status === 'playing').length;
    });
  }

  goToYourCards() { this.router.navigate(['cards']); }
  goToYourDecs() { this.router.navigate(['cards']); }
  goToGames() { this.router.navigate(['game']); }

}
