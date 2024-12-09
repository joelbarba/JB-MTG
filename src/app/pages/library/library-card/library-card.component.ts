import { Component, HostListener, ViewEncapsulation } from '@angular/core';
import { CommonModule, DecimalPipe } from '@angular/common';
import { Firestore, QuerySnapshot, QueryDocumentSnapshot, DocumentData, setDoc, updateDoc } from '@angular/fire/firestore';
import { getDocs, getDoc, collection, doc } from '@angular/fire/firestore';
import { FormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { BfConfirmService, BfGrowlService, BfListHandler, BfUiLibModule } from '@blueface_npm/bf-ui-lib';
import { MtgCardComponent } from '../../../core/common/internal-lib/mtg-card/mtg-card.component';
import { ShellService } from '../../../shell/shell.service';
import { AuthService } from '../../../core/common/auth.service';
import { ActivatedRoute, Router } from '@angular/router';
import { map, Subscription } from 'rxjs';
import { formatNumber } from '@angular/common';
import { DataService, TFullCard, TFullUnit } from '../../../core/dataService';


@Component({
  selector: 'app-library-card',
  standalone: true,
  imports: [
    CommonModule,
    TranslateModule,
    FormsModule,
    BfUiLibModule,
    MtgCardComponent,
    DecimalPipe,
],
  templateUrl: './library-card.component.html',
  styleUrl: './library-card.component.scss',
  encapsulation: ViewEncapsulation.None,
})
export class LibraryCardComponent {
  cardId!: string;
  card?: TFullCard;

  cardSub!: Subscription;

  credit$ = this.auth.profile$.pipe(map(p => p?.sats || 0));

  constructor(
    private shell: ShellService,
    private auth: AuthService,
    private firestore: Firestore,
    private route: ActivatedRoute,
    private growl: BfGrowlService,
    private router: Router,
    private dataService: DataService,
    private confirm: BfConfirmService,
  ) {
    this.shell.gameMode('off');
  }

  async ngOnInit() {
    this.cardId = this.route.snapshot.paramMap.get('cardId') || '';
    await this.dataService.loadPromise;
    this.card = this.dataService.cards.find(c => c.id === this.cardId);
    // console.log(this.card);
    this.cardSub = this.dataService.cards$.subscribe(cards => {
      this.card = cards.find(c => c.id === this.cardId);
    });
  }  

  ngOnDestroy() {
    this.cardSub?.unsubscribe();
  }

  goBack() { this.router.navigate(['library/']); }

  async buyUnit(unit: TFullUnit) {
    const formatPrice = formatNumber(unit.card.price, 'en-US', '1.0-0');
    let htmlContent = `Are you sure you want to buy 1 <b>${unit.card.name}</b> for <b>${formatPrice}</b> sats?`;
    const res = await this.confirm.open({ title: `Buy "${unit.card.name}"`, htmlContent, yesButtonText: 'Yes, buy it' });
    if (res === 'yes') {
      const error = await this.dataService.buyUnit(unit);
      if (error) { this.growl.error(error); }
      else { this.growl.success(`${this.card?.name} bought for ${formatNumber(unit.sellPrice || 0, 'en-US', '1.0-0')} sats`); }
    }
  }

  async askSellUnit(unit: TFullUnit) {
    const formatPrice = formatNumber(unit.card.price, 'en-US', '1.0-0');
    let htmlContent = `Are you sure you want to place a sell offer of 1 <b>${unit.card.name}</b> for <b>${formatPrice}</b> sats?`;
    
    const decks = this.dataService.yourDecks.filter(deck => deck.units.find(u => u.ref === unit.ref));
    if (decks.length) {
      htmlContent += `<br/><br/><b>Warning</b>: This unit is being used in ${decks.length} of your decks:<br/>`;
      htmlContent += decks.map(deck => `- ${deck.deckName}<br/>`);
    }

    const res = await this.confirm.open({ title: `Sell "${unit.card.name}"`, htmlContent, yesButtonText: 'Yes, sell it' });
    if (res === 'yes') {
      const price = typeof unit.card.price === 'string' ? Number.parseInt(unit.card.price || 0, 10) : unit.card.price;
      await this.dataService.sellUnit(unit, price);
      this.growl.success(`New Sell Offer`);
    }
  }

}
