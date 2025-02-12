import { CommonModule, formatNumber } from "@angular/common";
import { Component, HostListener } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { BfConfirmService, BfGrowlService, BfUiLibModule } from "bf-ui-lib";
import { NgbActiveModal } from "@ng-bootstrap/ng-bootstrap";
import { TranslateModule } from "@ngx-translate/core";
import { MtgCardComponent } from "../../common/internal-lib/mtg-card/mtg-card.component";
import { HoverTipDirective } from "../../common/internal-lib/bf-tooltip/bf-tooltip.directive";
import { DataService, TFullCard, TFullDeck, TFullUnit } from "../../dataService";
import { Router } from "@angular/router";

@Component({
  selector: 'modal-buy',
  templateUrl: './buy-modal.component.html',
  styleUrls : ['./buy-modal.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    TranslateModule,
    FormsModule,
    BfUiLibModule,
    MtgCardComponent,
    // HoverTipDirective,
  ],
})
export class BuyModalComponent {
  unit!: TFullUnit;
  price!: number;
  
  formattedPrice = '';
  buyBtnText = 'Buy it';
  btnDisabled = false;
  btnPromise!: Promise<void>;

  unitsYouOwn = 0;

  constructor(
    private ngbModal: NgbActiveModal,
    private dataService: DataService,
    private growl: BfGrowlService,
    private confirm: BfConfirmService,
    private router: Router,
  ) {}

  ngOnInit() {
    this.price = this.unit.sellPrice || this.unit.card.price;
    this.formattedPrice = formatNumber(this.price || 0, 'en-US', '1.0-0');
    this.buyBtnText = `Yes, buy it for ${this.formattedPrice} sats`;

    // Calculate how many of this card you already own
    const card = this.dataService.cards.find(c => c.id === this.unit.cardId);
    if (card) { this.unitsYouOwn = card.units.filter(u => u.isYours).length }
  }

  async buyIt() {
    this.btnDisabled = true;
    console.log('Buying 1', this.unit.card.name, 'for', this.price, 'sats. Ref=', this.unit);

    const error = await this.dataService.buyUnit(this.unit);
    if (error) { this.growl.error(error); }
    else { this.growl.success(`${this.unit.card?.name} bought for ${this.formattedPrice} sats`); }

    this.btnDisabled = false;
    this.close();
  }

  @HostListener('window:keyup', ['$event'])
  keyEvent(ev: KeyboardEvent) {
    if (ev.code === 'KeyY') { this.buyIt(); }
    ev.stopPropagation();
  }

  openCardUnits() {
    this.router.navigate(['/library', this.unit.cardId]);
    this.close();
  }

  close() { this.ngbModal.close(); }
}