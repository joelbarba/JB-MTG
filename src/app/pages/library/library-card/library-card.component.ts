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
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { SellOfferModalComponent } from '../../../core/modals/sellOfferModal/sell-offer-modal.component';
import { HoverTipDirective } from '../../../core/common/internal-lib/bf-tooltip/bf-tooltip.directive';


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
    HoverTipDirective,
],
  templateUrl: './library-card.component.html',
  styleUrl: './library-card.component.scss',
  encapsulation: ViewEncapsulation.None,
})
export class LibraryCardComponent {
  cardId!: string;
  card?: TFullCard;

  units: Array<TFullUnit> = []; // Filtered units

  cardSub!: Subscription;
  credit$ = this.dataService.yourCredit$;

  onlyYours = false;
  onlyOthers = false;
  onlyOnSale = false;

  constructor(
    private shell: ShellService,
    private auth: AuthService,
    private firestore: Firestore,
    private route: ActivatedRoute,
    private growl: BfGrowlService,
    private router: Router,
    private dataService: DataService,
    private confirm: BfConfirmService,
    private ngbModal: NgbModal,
  ) {
    this.shell.gameMode('off');
  }

  async ngOnInit() {
    this.cardId = this.route.snapshot.paramMap.get('cardId') || '';
    await this.dataService.loadPromise;
    this.showList();
    this.cardSub = this.dataService.cards$.subscribe(cards => this.showList());
    // console.log(this.card);
  }  

  ngOnDestroy() {
    this.cardSub?.unsubscribe();
  }

  goBack() { this.router.navigate(['library/']); }

  showList() {
    this.card = this.dataService.cards.find(c => c.id === this.cardId);
    if (this.card) {
      this.units = this.card.units.filter(unit => {
        if (this.onlyYours && !unit.isYours) { return false; }
        if (this.onlyOthers && unit.isYours) { return false; }
        if (this.onlyOnSale && !unit.sellPrice) { return false; }
        return true;
      });
    }
  }


  async buyUnit(unit: TFullUnit) {
    if (unit.sellPrice) {
      const formatPrice = formatNumber(unit.sellPrice, 'en-US', '1.0-0');
      let htmlContent = `Are you sure you want to buy 1 <b>${unit.card.name}</b> for <b>${formatPrice}</b> sats?`;
      const res = await this.confirm.open({ title: `Buy "${unit.card.name}"`, htmlContent, yesButtonText: 'Yes, buy it' });
      if (res === 'yes') {
        const error = await this.dataService.buyUnit(unit);
        if (error) { this.growl.error(error); }
        else { this.growl.success(`${this.card?.name} bought for ${formatNumber(unit.sellPrice || 0, 'en-US', '1.0-0')} sats`); }
      }
    }
  }

  async askSellUnit(unit: TFullUnit) {
    const modalRef = this.ngbModal.open(SellOfferModalComponent, { backdrop: 'static', centered: false, size: 'md' });
    modalRef.componentInstance.unit = unit;
  }

  // async askSellUnit(unit: TFullUnit) {
  //   const formatPrice = formatNumber(unit.card.price, 'en-US', '1.0-0');
  //   let htmlContent = `Are you sure you want to place a sell offer of 1 <b>${unit.card.name}</b> for <b>${formatPrice}</b> sats?`;
    
  //   const decks = this.dataService.yourDecks.filter(deck => deck.units.find(u => u.ref === unit.ref));
  //   if (decks.length) {
  //     htmlContent += `<br/><br/><b>Warning</b>: This unit is being used in ${decks.length} of your decks:<br/>`;
  //     htmlContent += decks.map(deck => `- ${deck.deckName}<br/>`);
  //   }

  //   const res = await this.confirm.open({ title: `Sell "${unit.card.name}"`, htmlContent, yesButtonText: 'Yes, sell it' });
  //   if (res === 'yes') {
  //     const price = typeof unit.card.price === 'string' ? Number.parseInt(unit.card.price || 0, 10) : unit.card.price;
  //     await this.dataService.sellUnit(unit, price);
  //     this.growl.success(`New Sell Offer`);
  //   }
  // }

}
