import { ICard, IUser, IUserCard, UserDeck } from 'src/typings';
import { Component, OnInit } from '@angular/core';
import { Observable } from 'rxjs';
import { AngularFirestore, AngularFirestoreCollection, AngularFirestoreDocument } from '@angular/fire/firestore';
import * as RxOp from 'rxjs/operators';
import { NgbModal, NgbActiveModal, ModalDismissReasons } from '@ng-bootstrap/ng-bootstrap';
import {BfConfirmService, BfGrowlService, BfListHandler} from '@blueface_npm/bf-ui-lib';
import {Globals} from '../../core/globals.service';
import {Profile} from '../../core/profile.service';
import {StoreService} from '../../core/store.service';
import {EditCardModalComponent} from './edit-card-modal/edit-card-modal.component';


@Component({
  selector: 'app-library',
  templateUrl: './library.component.html',
  styleUrls: ['./library.component.scss']
})
export class LibraryComponent implements OnInit {
  public cards$: Observable<any[]>;
  public cardsCollection: AngularFirestoreCollection<ICard>;
  public selected: ICard;
  public selCard$: Observable<ICard>;
  public lastCardId = 1;

  public cardsList: BfListHandler;
  public filters = { searchText: '', colorCode: '', cardType: '' };

  constructor(
    private afs: AngularFirestore,
    private modal: NgbModal,
    public globals: Globals,
    public store: StoreService,
    private profile: Profile,
  ) {


    this.cardsList  = new BfListHandler({
      listName: 'cardsList',
      data$: this.store.cards$,
      rowsPerPage: 44,
      orderFields: ['orderId'],
      filterFields: ['name'],
    });



    // this.cardsList.filterList = (list: Array<any>, filterText: string = '', filterFields: Array<string>): Array<any> => {
    //   const filteredList = this.cardsList.defaultFilterList(list, this.filters.searchText, filterFields);
    //   return filteredList.filter(item => {
    //     let match = (!this.filters.colorCode || (this.filters.colorCode === item.color));
    //     match = match && (!this.filters.cardType || (this.filters.cardType === item.type));
    //     return match;
    //   });
    // };

    // this.cardsList.connectObs(this.cards$);

  }

  async ngOnInit() {
    await this.profile.loadPromise;

    // this.store.cards$.subscribe(data => {
    //   console.log(data);
    //   this.cardsList.load(data);
    // });
  }

  public openAdd = () => {
    // const modalRef = this.modal.open(AddCardModalComponent, { size: 'lg' });
    // modalRef.componentInstance.lastId = this.lastCardId;
    // modalRef.componentInstance.cardsCollection = this.cardsCollection;
    // modalRef.result.then((newCard) => {
    //   console.log('new card', newCard);
    // });
  }

  public openEdit = (card: ICard) => {
    const modalRef = this.modal.open(EditCardModalComponent, { size: 'lg' });
    modalRef.componentInstance.refCard = card;
  }

  public openPurchase = (card: ICard) => {
    // const modalRef = this.modal.open(PurchaseCardModalComponent, { size: 'lg' });
    // modalRef.componentInstance.refCard = card;
  }

  public selectCard = (card: ICard) => {
    this.selected = card;
    // this.selCard$ = this.cards$.pipe(RxOp.map(cards => {
    //   if (!this.selected) { return {}; }
    //   return cards.getById(this.selected.id);
    // }));
  }



  public initDB = () => {
    // this.cardsCollection.doc('c1').set({ name: 'Island',   type: 'land', color: 'none', image: 'island.jpg',   text: 'Add one blue mana to your mana pool'});
    // this.cardsCollection.doc('c2').set({ name: 'Plains',   type: 'land', color: 'none', image: 'plains.jpg',   text: 'Add one white mana to your mana pool'});
    // this.cardsCollection.doc('c3').set({ name: 'Swamp',    type: 'land', color: 'none', image: 'swamp.jpg',    text: 'Add one black mana to your mana pool'});
    // this.cardsCollection.doc('c4').set({ name: 'Mountain', type: 'land', color: 'none', image: 'mountain.jpg', text: 'Add one red mana to your mana pool'});
    // this.cardsCollection.doc('c5').set({ name: 'Forest',   type: 'land', color: 'none', image: 'forest.jpg',   text: 'Add one green mana to your mana pool'});
    // this.cardsCollection.doc('c6' ).set({ name: 'Mox Emerald',       type: 'artifact', image: 'mox emerald.jpg',    color: 'none',    text: '' });
    // this.cardsCollection.doc('c7' ).set({ name: 'Mox Jet',           type: 'artifact', image: 'mox jet.jpg',        color: 'none',    text: '' });
    // this.cardsCollection.doc('c8' ).set({ name: 'Mox Pearl',         type: 'artifact', image: 'mox pearl.jpg',      color: 'none',    text: '' });
    // this.cardsCollection.doc('c9' ).set({ name: 'Mox Ruby',          type: 'artifact', image: 'mox ruby.jpg',       color: 'none',    text: '' });
    // this.cardsCollection.doc('c10').set({ name: 'Mox Sapphire',      type: 'artifact', image: 'mox sapphire.jpg',   color: 'none',    text: '' });
    // this.cardsCollection.doc('c11').set({ name: 'Sol Ring',          type: 'artifact', image: 'sol ring.jpg',       color: 'none',    text: '' });
    // this.cardsCollection.doc('c12').set({ name: 'Black Lotus',       type: 'artifact', image: 'black lotus.jpg',    color: 'none',    text: '' });
    // this.cardsCollection.doc('c13').set({ name: 'Bayou',             type: 'land', image: 'bayou.jpg',              color: 'none',    text: '' });
    // this.cardsCollection.doc('c14').set({ name: 'Badlands',          type: 'land', image: 'badlands.jpg',           color: 'none',    text: '' });
    // this.cardsCollection.doc('c15').set({ name: 'Plateau',           type: 'land', image: 'plateau.jpg',            color: 'none',    text: '' });
    // this.cardsCollection.doc('c16').set({ name: 'Savannah',          type: 'land', image: 'savannah.jpg',           color: 'none',    text: '' });
    // this.cardsCollection.doc('c17').set({ name: 'Scrubland',         type: 'land', image: 'scrubland.jpg',          color: 'none',    text: '' });
    // this.cardsCollection.doc('c18').set({ name: 'Taiga',             type: 'land', image: 'taiga.jpg',              color: 'none',    text: '' });
    // this.cardsCollection.doc('c19').set({ name: 'Tropical Island',   type: 'land', image: 'tropical island.jpg',    color: 'none',    text: '' });
    // this.cardsCollection.doc('c20').set({ name: 'Tundra',            type: 'land', image: 'tundra.jpg',             color: 'none',    text: '' });
    // this.cardsCollection.doc('c21').set({ name: 'Underground Sea',   type: 'land', image: 'underground sea.jpg',    color: 'none',    text: '' });
    // this.cardsCollection.doc('c22').set({ name: 'Volcanic Island',   type: 'land', image: 'volcanic island.jpg',    color: 'none',    text: '' });
    // this.cardsCollection.doc('c23').set({ name: 'Ancestral Recall',  type: 'land', image: 'ancestral recall.jpg',   color: 'blue',  text: '' });
    // this.cardsCollection.doc('c24').set({ name: 'Armageddon',        type: 'land', image: 'armageddon.jpg',         color: 'white', text: '' });
    // this.cardsCollection.doc('c25').set({ name: 'Bad Moon',          type: 'land', image: 'bad moon.jpg',           color: 'black', text: '' });
    // this.cardsCollection.doc('c26').set({ name: 'Black Knight',      type: 'land', image: 'black knight.jpg',       color: 'black', text: '' });
    // this.cardsCollection.doc('c27').set({ name: 'Dark Ritual',       type: 'land', image: 'dark ritual.jpg',        color: 'black', text: '' });
    // this.cardsCollection.doc('c28').set({ name: 'Drudge Skeletons',  type: 'land', image: 'drudge skeletons.jpg',   color: 'black', text: '' });
    // this.cardsCollection.doc('c29').set({ name: 'Fork',              type: 'land', image: 'fork.jpg',               color: 'red',   text: '' });
    // this.cardsCollection.doc('c30').set({ name: 'Howling Mine',      type: 'land', image: 'howling mine.jpg',       color: 'none',  text: '' });
    // this.cardsCollection.doc('c31').set({ name: 'Hypnotic Specter',  type: 'land', image: 'hypnotic specter.jpg',   color: 'black', text: '' });
    // this.cardsCollection.doc('c32').set({ name: 'Lightning Bolt',    type: 'land', image: 'lightning bolt.jpg',     color: 'red',   text: '' });
    // this.cardsCollection.doc('c33').set({ name: 'Shivan Dragon',     type: 'land', image: 'shivan dragon.jpg',      color: 'red',   text: '' });
    // this.cardsCollection.doc('c34').set({ name: 'Time Walk',         type: 'land', image: 'time walk.jpg',          color: 'blue',  text: '' });
  }
}



//
// // -----------------------------------------------------------------------------------
// @Component({
//   selector: 'add-card-modal',
//   templateUrl: 'add-card.modal.html'
// })
// export class AddCardModalComponent implements OnInit {
//   public newCard: Partial<ICard> = {};    // Working object
//   public lastId: number; // Reference coming from parent
//   public cardsCollection: AngularFirestoreCollection<ICard>;
//
//   constructor(
//     private afs: AngularFirestore,
//     public activeModal: NgbActiveModal,
//     private growl: BfGrowlService,
//     private modal: NgbModal,
//     public globals: Globals,
//     private profile: Profile,
//   ) { }
//
//   ngOnInit() {
//     // this.newCard = { name: 'Howling Mine', type: 'artifact', image: 'howling mine.jpg', color: 'none',  text: '' };
//     this.newCard = { color: 'none',  text: '', units: [] };
//     this.newCard.id = 'c' + ('000000' + (this.lastId + 1)).slice(-6).toString();
//     this.newCard.cast = [0, 0, 0, 0, 0, 0];
//   }
//
//   public createCard = () => {
//     const cardId = this.newCard.id;
//     delete this.newCard.id;
//     this.cardsCollection.doc(cardId).set(this.newCard);
//     this.growl.success(`ICard Updated Successfully`);
//     this.activeModal.close(this.newCard);
//   }
// }
//
//
//
//
//
//
// // -----------------------------------------------------------------------------------
// @Component({
//   selector: 'purchase-card-modal',
//   templateUrl: 'purchase-card.modal.html'
// })
// export class PurchaseCardModalComponent implements OnInit {
//   public refCard: ICard;     // Reference from the list
//   public editCard: ICard;    // Working object
//   private cardDoc: AngularFirestoreDocument<ICard>; // Afb reference
//
//   constructor(
//     private afs: AngularFirestore,
//     public activeModal: NgbActiveModal,
//     private growl: BfGrowlService,
//     private modal: NgbModal,
//     private globals: Globals,
//     private confirm: BfConfirmService,
//     public profile: Profile,
//   ) { }
//
//   ngOnInit() {
//
//     this.cardDoc = this.afs.doc<ICard>('cards/' + this.refCard.id);
//
//     const subs = this.cardDoc.snapshotChanges().subscribe(state => {
//       this.editCard = state.payload.data();
//       if (!this.editCard.cast) { this.editCard.cast = [0, 0, 0, 0, 0, 0]; }
//       if (!this.editCard.units) { this.editCard.units = []; }
//       subs.unsubscribe(); // Just take the value once
//     });
//
//   }
//
//   public selectUnit = (unit) => {
//     unit.owner = this.profile.userId;
//     this.cardDoc.update(this.editCard);
//     this.profile.addUnitCard(this.refCard.id, unit.ref);
//     this.growl.success(`You got a ${this.editCard.name}`);
//   }
//
//
//
// }
