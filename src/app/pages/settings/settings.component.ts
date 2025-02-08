import { Component, HostListener, Renderer2, ViewEncapsulation } from '@angular/core';
import { AuthService } from '../../core/common/auth.service';
import { ShellService } from '../../shell/shell.service';
import { CommonModule } from '@angular/common';
import { Firestore, QuerySnapshot, QueryDocumentSnapshot, DocumentData, setDoc, updateDoc, deleteDoc, Unsubscribe, onSnapshot } from '@angular/fire/firestore';
import { getDocs, getDoc, collection, doc } from '@angular/fire/firestore';
import { FormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { BfGrowlService, BfListHandler, BfUiLibModule } from 'bf-ui-lib';
import { MtgCardComponent } from "../../core/common/internal-lib/mtg-card/mtg-card.component";
import { TDBCard, TCast, TDBUser, TDBOwnership, TDBUnit } from '../../core/types';
import { cardTypes, colors, getTime, landTypes, randomUnitId, upkeepTypes } from '../../core/common/commons';
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
  firebaseCards: Array<TDBCard> = [];

  users: Array<TDBUser> = [];  
  cardsList: BfListHandler;
  
  selCard: TFullCard | null = null;

  colors = colors;
  cardTypes = cardTypes;
  upkeepTypes = upkeepTypes;
  landWalkTypes = landTypes.map(i => ({ value: i.value, text: i.text + '-Walk' }));

  hasBlackBorder = false;
  highlightNoneReady = true;
  addUnitsWithSellOffer = false;

  totalCards = 0;
  totalCardsReady = 0;

  private subs: Array<Unsubscribe> = [];

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
    this.cardsList.orderList = (list: Array<TDBCard>) => {
      list.sort((a,b) => a.id > b.id ? 1 : -1);
      return list;
    };
  }

  async ngOnInit() {
    await this.dataService.loadPromise;

    // Load Firebase /cards
    const firebaseCards: Array<TDBCard> = [];
    const allDocs: QuerySnapshot<DocumentData> = await getDocs(collection(this.firestore, 'cards'));
    allDocs.forEach(doc => firebaseCards.push({ id: doc.id, totalUnits: 1, ...doc.data() } as TDBCard));

    // Override the dbCards values with the firebase ones
    const cards = this.dataService.cards.map(card => {
      const firebaseCard = firebaseCards.find(c => c.id === card.id);
      if (firebaseCard) {
        card.units = card.units.slice(0, firebaseCard.totalUnits); // If there are fewer units in DB, cut them
        if (firebaseCard.totalUnits > card.units.length) { // If there are more, add them (with default owner)
          for (let t = card.units.length; t < firebaseCard.totalUnits; t++) { this.pushNewUnit(card); }
        }
      }
      return { ...card, ...firebaseCard, units: card.units };
    });

    this.cardsList.load(cards);

    this.users = this.dataService.users;
    this.users.sort((a,b) => a.name > b.name ? 1 : -1);

    this.selectCard(this.cardsList.loadedList[0]);
    this.updateTotals();
  }

  // ngOnDestroy() {
  //   this.subs.forEach(unsubscribe => unsubscribe());
  // }



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

  updateTotals() {
    this.totalCards = this.cardsList.loadedList.length
    this.totalCardsReady = this.cardsList.loadedList.filter(c => c.readyToPlay).length;
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
    // console.log(this.selCard);
  }

  pushNewUnit(card: TFullCard) {
    const totals = card.units.length;
    const shortRef = 'u' + ((totals + 1) + '').padStart(4, '0');
    card.units.push({ 
      shortRef  : shortRef,
      ref       : card.id + '.' + shortRef,
      ownerId   : this.dataService.defaultUser.uid,
      owner     : this.dataService.defaultUser,
      isYours   : true,
      cardId    : card.id,
      card      : card,
      sellPrice : this.addUnitsWithSellOffer ? card.price || 0 : null,
    });
  }


  createUnit(num = 1) {
    if (this.selCard) {
      for (let t = 0; t < num; t++) { this.pushNewUnit(this.selCard); }
      this.selCard.totalUnits = this.selCard.units.length;
      // setDoc(doc(this.firestore, 'units', ref), { ownerId  });
      // this.growl.success('New unit added');
    }
  }

  deleteUnit() {
    if (this.selCard) {
      this.selCard.units.splice(this.selCard.units.length - 1, 1);
      this.selCard.totalUnits = this.selCard.units.length;
      // deleteDoc(doc(this.firestore, 'units', unit.ref));
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
    card.totalUnits = card.units.length;

    const rawCard = card.keyFilter((v,k) => k !== 'id' && k !== 'units') as Omit<TDBCard, 'id'>; // Remove the fields .id and .units
    console.log('Saving Card', rawCard);
    await updateDoc(doc(this.firestore, 'cards', card.id), rawCard);
    // await setDoc(doc(this.firestore, 'cards', card.id), rawCard);

    // Update all units ownership
    const cardOwnership: { [key:string]: TDBUnit } = {};
    card.units.forEach(unit => {
      const ref = unit.shortRef;
      if (unit.sellPrice === undefined) { unit.sellPrice = null; }
      cardOwnership[ref] = { ownerId: unit.ownerId, sellPrice: unit.sellPrice };
    });
    console.log('saving card ownership', cardOwnership);
    await setDoc(doc(this.firestore, 'ownership', card.id), cardOwnership);
    
    // Set new time for the last update of the card units owners
    await updateDoc(doc(this.firestore, 'ownership', 'updates'), { [card.id]: getTime() });


    this.growl.success(`Card ${card.name} updated`);

    // this.newCard();
  }


  async newCard() {
    const lastId = this.cardsList.loadedList.at(-1)?.id;
    if (!lastId) { return; }
    const id = 'c' + ((Number.parseInt(lastId.slice(1)) + 1) + '').padStart(6, '0');
    const card: TDBCard = {
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
      notBlockByWalls : false,
      noTargetSpells  : false,
      canPreventDamage: false,
      colorProtection : null,
      landWalk        : null,
      maxInDeck       : 4,
      readyToPlay     : false,
      upkeepPlayer    : null,
      totalUnits      : 0,
    };
    // console.log('New Card:', card);
    await setDoc(doc(this.firestore, 'cards', id), card);
    // const fullCard = { ...card, units: [] };
    // this.cardsList.load([ ...this.dataService.cards, fullCard]);
    // this.selectCard(fullCard);
    this.cardsList.load(this.dataService.cards);
    this.selectCard(this.dataService.cards[this.dataService.cards.length - 1]);
    this.updateTotals();
  }

  numArr(num: number): Array<number> { return Array.from(Array(num).keys()) }

  countSellUnits() {
    return this.selCard?.units.filter(u => u.sellPrice !== null).length || 0;
  }
  nextCard() {
    const list = this.cardsList.loadedList;
    this.selectCard(list[Math.min(list.indexOf(this.selCard) + 1, list.length - 1)]); // Select the next card
    this.updateTotals();
  }


  async customUnitCreation() {
    if (this.selCard) {
      this.addUnitsWithSellOffer = false; this.createUnit(9);
      this.addUnitsWithSellOffer = true;  this.createUnit(10);

      await this.saveCard(this.selCard);      
      this.nextCard();
    }
  }

  showingCode = false;
  cardsDBCode = '';

  showCode() {
    console.log('show code');
    this.showingCode = !this.showingCode;
    if (this.showingCode) {
      this.cardsDBCode = `import { TDBCard } from "./types";\n\n`;
      this.cardsDBCode += `export const dbCards: TDBCard[] = [`;

      this.dataService.cards.forEach(card => {

        const colorProtection = card.colorProtection ? `'${card.colorProtection}'` : 'null';
        const upkeepPlayer = card.upkeepPlayer ? `'${card.upkeepPlayer}'` : 'null';
        const landWalk = card.landWalk ? `'${card.landWalk}'` : 'null';
        
        this.cardsDBCode += `\n  {`;
        this.cardsDBCode += `\n    id:               '${card.id}',`;
        this.cardsDBCode += `\n    name:             \`${card.name}\`,`;
        this.cardsDBCode += `\n    image:            '${card.image}',`;
        this.cardsDBCode += `\n    cast:             [${card.cast}],`;
        this.cardsDBCode += `\n    color:            '${card.color}',`;
        this.cardsDBCode += `\n    text:             '${card.text}',`;
        this.cardsDBCode += `\n    type:             '${card.type}',`;
        this.cardsDBCode += `\n    price:            ${card.price},`;
        this.cardsDBCode += `\n    attack:           ${card.attack || '0'},`;
        this.cardsDBCode += `\n    defense:          ${card.defense || '0'},`;
        this.cardsDBCode += `\n    isWall:           ${!!card.isWall},`;
        this.cardsDBCode += `\n    isFlying:         ${!!card.isFlying},`;
        this.cardsDBCode += `\n    isTrample:        ${!!card.isTrample},`;
        this.cardsDBCode += `\n    isFirstStrike:    ${!!card.isFirstStrike},`;
        this.cardsDBCode += `\n    isHaste:          ${!!card.isHaste},`;
        this.cardsDBCode += `\n    canRegenerate:    ${!!card.canRegenerate ? 'true' : 'null'},`;
        this.cardsDBCode += `\n    notBlockByWalls:  ${!!card.notBlockByWalls},`;
        this.cardsDBCode += `\n    noTargetSpells:   ${!!card.noTargetSpells},`;
        this.cardsDBCode += `\n    canPreventDamage: ${!!card.canPreventDamage},`;
        this.cardsDBCode += `\n    colorProtection:  ${colorProtection},`;
        this.cardsDBCode += `\n    upkeepPlayer:     ${upkeepPlayer},`;
        this.cardsDBCode += `\n    landWalk:         ${landWalk},`;
        this.cardsDBCode += `\n    readyToPlay:      ${!!card.readyToPlay},`;
        if (card.border)    { this.cardsDBCode += `\n    border:           '${card.border || 'white'}',`; }
        if (card.maxInDeck) { this.cardsDBCode += `\n    maxInDeck:        ${card.maxInDeck || 'null'},`; }
        this.cardsDBCode += `\n    totalUnits:       ${card.units.length}`;
        this.cardsDBCode += `\n  },`;
      });     
       
      this.cardsDBCode += `\n];`;
    }

    navigator.clipboard.writeText(this.cardsDBCode);

    this.dataService.cards.forEach(card => {
      const match = dbCards.find(c => c.id === card.id) as TDBCard;
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

  }

  codeForCardUnits() {
    console.log('show code');
    this.showingCode = !this.showingCode;
    if (this.showingCode) {
      this.cardsDBCode = `export const dbCardUnits: { [key: string]: string[] } = {`;
      this.dataService.cards.forEach(card => {
        this.cardsDBCode += `\n  '${card.id}': [`;
        this.cardsDBCode += card.units.map(unit => `'${unit.shortRef}'`).join(`, `)
        // card.units.forEach(unit => this.cardsDBCode += `'${unit.shortRef}', `);
        this.cardsDBCode += `],`;
      });     
       
      this.cardsDBCode += `\n};`;
    }
    navigator.clipboard.writeText(this.cardsDBCode);
  }


}



