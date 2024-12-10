import { CommonModule, formatNumber } from "@angular/common";
import { Component } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { BfConfirmService, BfGrowlService, BfUiLibModule } from "@blueface_npm/bf-ui-lib";
import { NgbActiveModal } from "@ng-bootstrap/ng-bootstrap";
import { TranslateModule } from "@ngx-translate/core";
import { MtgCardComponent } from "../../common/internal-lib/mtg-card/mtg-card.component";
import { HoverTipDirective } from "../../common/internal-lib/bf-tooltip/bf-tooltip.directive";
import { DataService, TFullCard, TFullDeck, TFullUnit } from "../../dataService";

@Component({
  selector: 'modal-sell-offer',
  standalone: true,
  imports: [
    CommonModule,
    TranslateModule,
    FormsModule,
    BfUiLibModule,
    MtgCardComponent,
    // HoverTipDirective,
  ],
  templateUrl: './sell-offer-modal.component.html',
  styleUrls: ['./sell-offer-modal.component.scss'],
})
export class SellOfferModalComponent {
  unit!: TFullUnit;
  price!: number;
  deckCount = 0;
  deckNamesList: Array<string> = [];

  constructor(
    private ngbModal: NgbActiveModal,
    private dataService: DataService,
    private growl: BfGrowlService,
    private confirm: BfConfirmService,
  ) {}

  ngOnInit() {
    this.price = this.unit.sellPrice || this.unit.card.price;

    const decks = this.dataService.yourDecks.filter(deck => deck.units.find(u => u.ref === this.unit.ref));
    this.deckCount = decks.length;
    this.deckNamesList = decks.map(deck => deck.deckName);
  }


  async addSellOffer() {
    if (this.price <= 0) { return; }
    const formatPrice = formatNumber(this.price, 'en-US', '1.0-0');
    // let htmlContent = `Are you sure you want to place a sell offer of 1 <b>${this.unit.card.name}</b> for <b>${formatPrice}</b> sats?`;
    // const decks = this.dataService.yourDecks.filter(deck => deck.units.find(u => u.ref === this.unit.ref));
    // if (decks.length) {
    //   htmlContent += `<br/><br/><b>Warning</b>: This unit is being used in ${decks.length} of your decks:<br/>`;
    //   htmlContent += decks.map(deck => `- ${deck.deckName}<br/>`);
    // }
    // const res = await this.confirm.open({ title: `Sell "${this.unit.card.name}"`, htmlContent, yesButtonText: 'Yes, sell it' });
    // if (res === 'yes') {}

    await this.dataService.sellUnit(this.unit, this.price);
    this.growl.success(`${this.unit.card.name} is now for sale for ${formatPrice} sats`);
    this.close();
  }

  async removeSellOffer() {
    await this.dataService.removeSellOffer(this.unit);
    this.growl.success(`${this.unit.card.name} sell offer removed`);
    this.close();
  }

  close() { this.ngbModal.close(); }
}