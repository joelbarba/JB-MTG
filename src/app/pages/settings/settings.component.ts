import { Component, HostListener, Renderer2, ViewEncapsulation } from '@angular/core';
import { AuthService } from '../../core/common/auth.service';
import { ShellService } from '../../shell/shell.service';
import { CommonModule } from '@angular/common';
import { Firestore, QuerySnapshot, QueryDocumentSnapshot, DocumentData, setDoc, updateDoc, deleteDoc } from '@angular/fire/firestore';
import { getDocs, getDoc, collection, doc } from '@angular/fire/firestore';
import { FormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { BfGrowlService, BfListHandler, BfUiLibModule } from 'bf-ui-lib';
import { MtgCardComponent } from "../../core/common/internal-lib/mtg-card/mtg-card.component";
import { TCard, TCast, TUser } from '../../core/types';
import { cardTypes, colors, randomUnitId, upkeepTypes } from '../../core/common/commons';
import { DataService, TFullCard, TFullUnit } from '../../core/dataService';
import { dbCards } from '../../core/dbCards';

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
  
  selCard: TFullCard | null = null;

  colors = colors;
  cardTypes = cardTypes;
  upkeepTypes = upkeepTypes;

  hasBlackBorder = false;
  highlightNoneReady = true;

  constructor(
    private shell: ShellService,
    private auth: AuthService,
    private firestore: Firestore,
    private growl: BfGrowlService,
    private dataService: DataService,
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
    await this.dataService.loadPromise;
    this.cardsList.load(this.dataService.cards);

    this.users = this.dataService.users;
    this.users.sort((a,b) => a.name > b.name ? 1 : -1);

    this.selectCard(this.cardsList.loadedList[0]);
    // this.showCode();
  }

  filterReadyToPlay(value: boolean) {
    if (value) {
      this.cardsList.filter(true, 'readyToPlay');
    } else {
      this.cardsList.resetFilters();
    }
  }

  prepareName() {
    if (this.selCard && this.selCard.image && this.selCard.name === 'New Card') {
      this.selCard.name = this.selCard.image.split('.jpg')[0].replace(/_/g, ' ');
      this.selCard.name = this.selCard.name.split(' ').map(v => v.charAt(0).toUpperCase() + v.slice(1)).join(' ');
    }
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

  


  selectCard(card: TFullCard) {
    this.selCard = card;
    this.hasBlackBorder = card.border === 'black';
    this.selCard.upkeepPlayer = this.selCard.upkeepPlayer || null;
    console.log(this.selCard);
  }


  createUnit() {
    if (this.selCard) {
      const ref = this.selCard.id + '.' + randomUnitId(20);
      const ownerId = this.dataService.defaultUser.uid;
      this.selCard.units.push({ 
        ref,
        ownerId,
        owner    : this.dataService.defaultUser,
        isYours  : true,
        cardId   : this.selCard.id,
        shortRef : ref.split('.')[1],
        card     : this.selCard,
      });
      setDoc(doc(this.firestore, 'units', ref), { ownerId  });
      // this.growl.success('New unit added');
    }
  }

  deleteUnit(unit: TFullUnit) {
    if (this.selCard) {
      this.selCard.units.splice(this.selCard.units.indexOf(unit), 1);
      deleteDoc(doc(this.firestore, 'units', unit.ref));
    }
  }



  async saveCard(card: TFullCard) {
    card.cast = card.cast.map((v: number | string) => Number.parseInt(v as string, 10)) as TCast;
    if (typeof card.attack === 'string') { card.attack = Number.parseInt(card.attack, 10); }
    if (typeof card.defense === 'string') { card.defense = Number.parseInt(card.defense, 10); }
    card.isFlying      = !!card.isFlying;
    card.isTrample     = !!card.isTrample;
    card.isFirstStrike = !!card.isFirstStrike;
    card.isHaste       = !!card.isHaste;
    card.isWall        = !!card.isWall;
    card.border = this.hasBlackBorder ? 'black' : 'white';

    const rawCard = card.keyFilter((v,k) => k !== 'id' && k !== 'units') as Omit<TCard, 'id'>; // Remove the fields .id and .units
    console.log('Saving Card', rawCard);
    await updateDoc(doc(this.firestore, 'cards', card.id), rawCard);
    // await setDoc(doc(this.firestore, 'cards', card.id), rawCard);
    this.growl.success(`Card ${card.name} updated`);

    const list = this.cardsList.loadedList;
    this.selectCard(list[Math.min(list.indexOf(card) + 1, list.length - 1)]); // Select the next card
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
      border          : 'white',
      isWall          : false,
      isFlying        : false,
      isTrample       : false,
      isFirstStrike   : false,
      isHaste         : false,
      canRegenerate   : false,
      colorProtection : null,
      maxInDeck       : 4,
      readyToPlay     : false,
      upkeepPlayer    : null,
    };
    // console.log('New Card:', card);
    await setDoc(doc(this.firestore, 'cards', id), card);
    // const fullCard = { ...card, units: [] };
    // this.cardsList.load([ ...this.dataService.cards, fullCard]);
    // this.selectCard(fullCard);
    this.cardsList.load(this.dataService.cards);
    this.selectCard(this.dataService.cards[this.dataService.cards.length - 1]);
  }

  numArr(num: number): Array<number> { return Array.from(Array(num).keys()) }

  // async dbTransfer() {
  //   // const snapshot: QuerySnapshot<DocumentData> = await getDocs(collection(this.firestore, 'cards'));
  //   // const cards = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as TCard));
  //   // cards.forEach(card => {
  //   //   card.units.forEach(unit => {
  //   //     setDoc(doc(this.firestore, 'units', unit.ref), { ownerId: unit.owner });
  //   //   });
  //   // });
  // }

  showingCode = false;
  cardsDBCode = '';
  showCode() {
    console.log('show code');
    this.showingCode = !this.showingCode;
    if (this.showingCode) {
      this.cardsDBCode = `import { TCard } from "./types";\n\n`;
      this.cardsDBCode += `export const dbCards: TCard[] = [`;

      this.dataService.cards.forEach(card => {

        const colorProtection = card.colorProtection ? `'${card.colorProtection}'` : 'null';
        const upkeepPlayer = card.upkeepPlayer ? `'${card.upkeepPlayer}'` : 'null';
        
        this.cardsDBCode += `\n  {`;
        this.cardsDBCode += `\n    id:              '${card.id}', `;
        this.cardsDBCode += `\n    name:            \`${card.name}\`, `;
        this.cardsDBCode += `\n    image:           '${card.image}', `;
        this.cardsDBCode += `\n    cast:            [${card.cast}], `;
        this.cardsDBCode += `\n    color:           '${card.color}', `;
        this.cardsDBCode += `\n    text:            '${card.text}', `;
        this.cardsDBCode += `\n    type:            '${card.type}', `;
        this.cardsDBCode += `\n    price:           ${card.price}, `;
        this.cardsDBCode += `\n    attack:          ${card.attack || '0'}, `;
        this.cardsDBCode += `\n    defense:         ${card.defense || '0'}, `;
        this.cardsDBCode += `\n    isWall:          ${!!card.isWall}, `;
        this.cardsDBCode += `\n    isFlying:        ${!!card.isFlying}, `;
        this.cardsDBCode += `\n    isTrample:       ${!!card.isTrample}, `;
        this.cardsDBCode += `\n    isFirstStrike:   ${!!card.isFirstStrike}, `;
        this.cardsDBCode += `\n    isHaste:         ${!!card.isHaste}, `;
        this.cardsDBCode += `\n    canRegenerate:   ${!!card.canRegenerate}, `;
        this.cardsDBCode += `\n    colorProtection: ${colorProtection}, `;
        this.cardsDBCode += `\n    upkeepPlayer:    ${upkeepPlayer}, `;
        this.cardsDBCode += `\n    readyToPlay:     ${!!card.readyToPlay}, `;
        if (card.border) { this.cardsDBCode += `\n    border:          '${card.border || 'white'}', `; }
        if (card.maxInDeck) { this.cardsDBCode += `\n    maxInDeck:       ${card.maxInDeck || 'null'}, `; }
        this.cardsDBCode += `\n  },`;
      });     
       
      this.cardsDBCode += `\n];`;
    }

    navigator.clipboard.writeText(this.cardsDBCode);

    this.dataService.cards.forEach(card => {
      const match = dbCards.find(c => c.id === card.id) as TCard;
      if (!match) {
        console.log('New Card: ' + card.id + ' - ' + card.name, card);
      } else {
        // let diff = false;
        // for (const prop in match) {
        //   if (match[prop] !== card[prop]) { diff = true; }
        // }
        // console.log(`Card with differences: ${property}: ${object[property]}`);
      }
    });

    // setTimeout(() => {
    //   let text = document.querySelector('#db-code')?.childNodes[0];
    //   let range = new Range();
    //   let selection = document.getSelection();
    //   if (text && selection) {
    //     range.setStart(text, 0);
    //     range.setEnd(text, 100);
    //     selection.removeAllRanges();
    //     selection.addRange(range);        
    //   }
    // }, 500);


  }
}



