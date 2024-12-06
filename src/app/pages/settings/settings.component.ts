import { Component, HostListener, Renderer2, ViewEncapsulation } from '@angular/core';
import { AuthService } from '../../core/common/auth.service';
import { ShellService } from '../../shell/shell.service';
import { CommonModule } from '@angular/common';
import { Firestore, QuerySnapshot, QueryDocumentSnapshot, DocumentData, setDoc, updateDoc } from '@angular/fire/firestore';
import { getDocs, getDoc, collection, doc } from '@angular/fire/firestore';
import { FormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { BfGrowlService, BfListHandler, BfUiLibModule } from '@blueface_npm/bf-ui-lib';
import { MtgCardComponent } from "../../core/common/internal-lib/mtg-card/mtg-card.component";
import { TCard, TCast, TUser } from '../../core/types';
import { cardOrderList, cardTypes, colors, randomUnitId } from '../../core/common/commons';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [
    CommonModule,
    TranslateModule,
    FormsModule,
    BfUiLibModule,
    MtgCardComponent,
],
  templateUrl: './settings.component.html',
  styleUrl: './settings.component.scss',
})
export class SettingsComponent {
  users: Array<TUser> = [];  
  cardsList: BfListHandler;
  
  selCard: TCard | null = null;

  colors = colors;
  cardTypes = cardTypes;

  constructor(
    private shell: ShellService,
    private auth: AuthService,
    public firestore: Firestore,
    public growl: BfGrowlService,
  ) {
    this.shell.gameMode('off');
    this.cardsList = new BfListHandler({
      listName      : 'cards-list',
      filterFields  : ['name'],
      orderFields   : ['id'],
      orderReverse  : false,
      rowsPerPage   : 50000,
    });
    // this.cardsList.orderList = cardOrderList;
    this.cardsList.orderList = (list: Array<TCard>) => {
      list.sort((a,b) => a.id > b.id ? 1 : -1);
      return list;
    };
  }

  async ngOnInit() {
    const snapshot: QuerySnapshot<DocumentData> = await getDocs(collection(this.firestore, 'cards'));
    const cards = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as TCard));
    this.cardsList.load(cards);

    const snapshotUsers: QuerySnapshot<DocumentData> = await getDocs(collection(this.firestore, 'users'));
    this.users = snapshotUsers.docs.map(doc => ({ uid: doc.id, ...doc.data() } as TUser));
    this.users.sort((a,b) => a.name > b.name ? 1 : -1);

    // console.log(this.cards);
    this.selectCard(this.cardsList.loadedList[0]);

  }



  // @HostListener('window:keyup', ['$event'])
  // keyEvent(ev: KeyboardEvent) {
  //   if (ev.code === 'ArrowLeft' || ev.code === 'ArrowRight') {
  //   const list = this.cardsList.loadedList;
  //   const ind = list.indexOf(this.selCard);
  //     if (ev.code === 'ArrowLeft' && ind > 0) { this.selectCard(list[ind -1]); }
  //     if (ev.code === 'ArrowRight' && ind < list.length - 1) { this.selectCard(list[ind + 1]); }
  //   }
  //   ev.stopPropagation();
  // }

  


  units: Array<{ ref: string, owner: TUser | null }> = [];
  selectCard(card: TCard) {
    this.selCard = card;
    console.log(this.selCard);
    this.selCard.units = this.selCard.units || [];
    this.units = this.selCard.units.map(unit => {
      return { ref: unit.ref, owner: this.users.find(u => u.uid === unit.owner) || null };
    });
  }


  createUnit() {
    if (this.selCard) {
      const joelOwner = this.users.find(u => u.uid === '4cix25Z3DPNgcTFy4FcsYmXjdSi1') || null;
      this.units.push({ ref: this.selCard.id + '.' + randomUnitId(20), owner: joelOwner });
      // this.growl.success('New unit added');
    }
  }

  deleteUnit(unit: { ref: string, owner: TUser | null }) {
    this.units.splice(this.units.indexOf(unit), 1);
  }



  async saveCard(card: TCard) {
    card.units = this.units.map(u => ({ ref: u.ref, owner: u.owner?.uid || '4cix25Z3DPNgcTFy4FcsYmXjdSi1' }));
    card.cast = card.cast.map((v: number | string) => Number.parseInt(v as string, 10)) as TCast;
    if (typeof card.attack === 'string') { card.attack = Number.parseInt(card.attack, 10); }
    if (typeof card.defense === 'string') { card.defense = Number.parseInt(card.defense, 10); }
    card.isFlying      = !!card.isFlying;
    card.isTrample     = !!card.isTrample;
    card.isFirstStrike = !!card.isFirstStrike;
    card.isHaste       = !!card.isHaste;
    card.isWall        = !!card.isWall;
    const docObj = card.keyFilter((v,k) => k !== 'id') as Partial<TCard>; // Remove the field .id
    // const docObj = card.keyFilter('name, image, color, type, attack, defense, cast, text, readyToPlay') as Partial<TCard>;
    console.log('Saving Card', docObj);
    await updateDoc(doc(this.firestore, 'cards', card.id), docObj);
    this.growl.success(`Card ${card.name} updated`);

    const list = this.cardsList.loadedList;
    this.selectCard(list[Math.min(list.indexOf(card) + 1, list.length - 1)]);
  }


  async newCard() {
    const lastId = this.cardsList.loadedList.at(-1)?.id;
    if (!lastId) { return; }
    const id = 'c' + ((Number.parseInt(lastId.slice(1)) + 1) + '').padStart(6, '0');
    const card: TCard = {
      id,
      name            : 'New Card',
      image           : 'image',
      color           : 'uncolored',
      cast            : [0,0,0,0,0,0],
      text            : '',
      type            : 'land',
      price           : 0,
      attack          : 0,
      defense         : 0,
      isWall          : false,
      isFlying        : false,
      isTrample       : false,
      isFirstStrike   : false,
      isHaste         : false,
      colorProtection : null,
      maxInDeck       : 4,
      readyToPlay     : false,
      units           : [],
    };
    console.log('New Card:', card);
    await setDoc(doc(this.firestore, 'cards', id), card);
    this.cardsList.load(this.cardsList.loadedList.push(card));
    this.selectCard(card);
  }

  numArr(num: number): Array<number> { return Array.from(Array(num).keys()) }
}
