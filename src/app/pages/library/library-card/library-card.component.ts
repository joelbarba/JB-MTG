import { Component, HostListener, ViewEncapsulation } from '@angular/core';
import { CommonModule, DecimalPipe } from '@angular/common';
import { Firestore, QuerySnapshot, QueryDocumentSnapshot, DocumentData, setDoc, updateDoc } from '@angular/fire/firestore';
import { getDocs, getDoc, collection, doc } from '@angular/fire/firestore';
import { FormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { BfConfirmService, BfGrowlService, BfListHandler, BfUiLibModule } from '@blueface_npm/bf-ui-lib';
import { MtgCardComponent } from '../../../core/common/internal-lib/mtg-card/mtg-card.component';
import { TCard, TMarketCard, TUnitCard, TUser } from '../../../core/types';
import { ShellService } from '../../../shell/shell.service';
import { AuthService } from '../../../core/common/auth.service';
import { ActivatedRoute, Router } from '@angular/router';
import { map } from 'rxjs';
import { formatNumber } from '@angular/common';

type TExtUnit = { ref: string, ownerId: string, ownerName?: string, forSale: boolean, price: number, isYours: boolean };

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
  card?: TCard;

  users!: Array<TUser>;
  market!: TMarketCard; // buying and selling offers
  extUnits!: Array<TExtUnit>;

  credit$ = this.auth.profile$.pipe(map(p => p?.sats || 0));

  constructor(
    private shell: ShellService,
    private auth: AuthService,
    private firestore: Firestore,
    private route: ActivatedRoute,
    private growl: BfGrowlService,
    private router: Router,
  ) {
    this.shell.gameMode('off');
  }

  async ngOnInit() {
    this.loadCard(this.route.snapshot.paramMap.get('cardId') || '');    
  }

  goBack() { this.router.navigate(['library/']); }

  async loadCard(cardId: string) {
    this.cardId = cardId;
    const docSnap = await getDoc(doc(this.firestore, 'cards', this.cardId));
    this.card = docSnap.data() as TCard;

    await Promise.all([
      this.loadUsers(),
      this.loadCardOffers(),
    ]);

    this.extUnits = this.card.units.map(unit => {
      const offer = this.market ? this.market.sellOffer.find(o => o.ref === unit.ref) : null;
      return {
        ref       : unit.ref.slice(8),
        ownerId   : unit.owner,
        ownerName : this.users.find(u => u.uid === unit.owner)?.name,
        forSale   : !!offer,
        price     : offer ? offer.price : this.card?.price || 0,
        isYours   : unit.owner === this.auth.profileUserId
      }
    });
  }

  async loadCardOffers() {
    const docSnap = await getDoc(doc(this.firestore, 'market', this.cardId));
    this.market = docSnap.data() as TMarketCard;
  }

  async loadUsers() {
    const snapshotUsers: QuerySnapshot<DocumentData> = await getDocs(collection(this.firestore, 'users'));
    this.users = snapshotUsers.docs.map(doc => ({ uid: doc.id, ...doc.data() } as TUser));
    this.users.sort((a,b) => a.name > b.name ? 1 : -1);
  }


  async buyUnit(unit: TExtUnit) {  // TODO: All this logic should go to a cloud function to be called through a webAPI
    if (typeof unit.price === 'string') { unit.price = Number.parseInt(unit.price, 10); }
    console.log('Buying unit', unit);
    const ref = this.cardId + '.' + unit.ref;

    // Take buyer money (your money)
    if ((this.auth.profile?.sats || 0) < unit.price) { return this.growl.error(`You don't have enough sats to buy it`); }
    this.auth.spendSats(unit.price);
    
    // Add money to the seller
    let docSnap = await getDoc(doc(this.firestore, 'users', unit.ownerId));
    const owner = docSnap.data() as TUser;
    owner.sats += unit.price;
    await updateDoc(doc(this.firestore, 'users', unit.ownerId), { sats: owner.sats });
    
    // Change unit owner
    docSnap = await getDoc(doc(this.firestore, 'cards', this.cardId));
    const card = docSnap.data() as TCard;
    const dbUnit = card.units.find(u => u.ref === ref);
    if (dbUnit && this.auth.profileUserId) {
      dbUnit.owner = this.auth.profileUserId;
      await updateDoc(doc(this.firestore, 'cards', this.cardId), { units: card.units });
      unit.ownerId = this.auth.profileUserId;
      unit.ownerName = this.auth.profileUserName;
    }

    // Delete Offer
    docSnap = await getDoc(doc(this.firestore, 'market', this.cardId));
    const market = docSnap.data() as TMarketCard;
    const offer = market.sellOffer.find(o => o.ref === ref);
    if (offer) {
      market.sellOffer.splice(market.sellOffer.indexOf(offer), 1);
      await updateDoc(doc(this.firestore, 'market', this.cardId), { sellOffer: market.sellOffer });
      unit.forSale = false;
    }

    this.growl.success(`${this.card?.name} bought for ${formatNumber(unit.price, 'en-US', '1.0-0')} sats`);
  }

}
