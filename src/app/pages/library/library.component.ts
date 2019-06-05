import { Component, OnInit } from '@angular/core';
import { Observable } from 'rxjs';
import { AngularFirestore, AngularFirestoreCollection, AngularFirestoreDocument } from '@angular/fire/firestore';
import * as RxOp from 'rxjs/operators';
import { NgbModal, NgbActiveModal, ModalDismissReasons } from '@ng-bootstrap/ng-bootstrap';
import { NgForm } from '@angular/forms';
import { BfGrowlService, BfConfirmService } from 'bf-ui-lib';
import { Globals } from 'src/app/globals/globals.service';
import { ListHandler } from 'src/app/globals/listHandler';


export interface Card {
  id?: string;
  orderId?: string;
  units: Array<string>;
  name: string;
  type: string;
  color: string;
  text: string;
  image: string;
  cast: Array<number>;
  power: number;
  defence: number;
}



@Component({
  selector: 'app-library',
  templateUrl: './library.component.html',
  styleUrls: ['./library.component.scss']
})
export class LibraryComponent implements OnInit {
  public cards$: Observable<any[]>;
  public cardsCollection: AngularFirestoreCollection<Card>;
  public selected: Card;
  public lastCardId = 1;

  public cardsList: ListHandler;
  public filters = { searchText: '', colorCode: '', cardType: '' };

  constructor(
    private afs: AngularFirestore,
    private modal: NgbModal,
    private globals: Globals,
  ) {


    this.cardsCollection = afs.collection('cards');
    // this.cards$ = afs.collection('cards').valueChanges();

    this.cards$ = this.cardsCollection.snapshotChanges().pipe(
      RxOp.map(actions => {
        return actions.map(a => {
          const data = a.payload.doc.data() as Card;
          const id = a.payload.doc.id;

          // Find the highest ID (c9999)
          const numId = Number.parseInt(id.slice(1));
          data.orderId = ('00000' + numId).slice(-5).toString();

          if (numId > this.lastCardId) { this.lastCardId  = numId; }

          return { id, ...data };
        });
      })
    );


    const listConfig = { rowsPerPage: 20, orderFields: ['orderId'], filterFields: ['name'] };
    this.cardsList  = new ListHandler({ ...listConfig, listName: 'cardsList' });
    // this.cardsList.loadFromObs(this.cards$.pipe(
    //   RxOp.map(content => ({ status: 2, content }))
    // ));

    this.cardsList.filterList = (list: Array<any>, filterText: string = '', filterFields: Array<string>): Array<any> => {
      let filteredList = this.cardsList.defaultFilterList(list, this.filters.searchText, filterFields);
      return filteredList.filter(item => {
        let match = (!this.filters.colorCode || (this.filters.colorCode === item.color));
        match = match && (!this.filters.cardType || (this.filters.cardType === item.type));
        return match;
      });
    };

    this.cardsList.connectObs(this.cards$);

  }

  ngOnInit() {  }

  public openAdd = () => {
    const modalRef = this.modal.open(AddCardModalComponent, { size: 'lg' });
    modalRef.componentInstance.lastId = this.lastCardId;
    modalRef.componentInstance.cardsCollection = this.cardsCollection;
    modalRef.result.then((newCard) => {
      console.log('new card', newCard);
    });
  }

  public openEdit = (card: Card) => {
    const modalRef = this.modal.open(EditCardModalComponent, { size: 'lg' });
    modalRef.componentInstance.refCard = card;
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




// -----------------------------------------------------------------------------------
@Component({
  selector: 'add-card-modal',
  templateUrl: 'add-card.modal.html'
})
export class AddCardModalComponent implements OnInit {
  public newCard: Partial<Card> = {};    // Working object
  public lastId: number; // Reference coming from parent
  public cardsCollection: AngularFirestoreCollection<Card>;

  constructor(
    private afs: AngularFirestore,
    public activeModal: NgbActiveModal,
    private growl: BfGrowlService,
    private modal: NgbModal,
    private globals: Globals,
  ) { }

  ngOnInit() {
    // this.newCard = { name: 'Howling Mine', type: 'artifact', image: 'howling mine.jpg', color: 'none',  text: '' };
    this.newCard.id = 'c' + (this.lastId + 1);
    this.newCard = { color: 'none',  text: '' };
    this.newCard.cast = [0, 0, 0, 0, 0, 0];
    // this.newCard.power = 5;
    // this.newCard.defence = 2;
  }

  public createCard = () => {
    // this.cardDoc.update(this.editCard);
    const cardId = this.newCard.id;
    delete this.newCard.id;
    this.cardsCollection.doc(cardId).set(this.newCard);
    this.growl.success(`Card Updated Successfully`);
    this.activeModal.close(this.newCard);
  }
}




// -----------------------------------------------------------------------------------
@Component({
  selector: 'edit-card-modal',
  templateUrl: 'edit-card.modal.html'
})
export class EditCardModalComponent implements OnInit {
  public refCard: Card;     // Reference from the list
  public editCard: Card;    // Working object
  private cardDoc: AngularFirestoreDocument<Card>; // Afb reference

  constructor(
    private afs: AngularFirestore,
    public activeModal: NgbActiveModal,
    private growl: BfGrowlService,
    private modal: NgbModal,
    private globals: Globals,
    private confirm: BfConfirmService,
  ) { }

  ngOnInit() {

    this.cardDoc = this.afs.doc<Card>('cards/' + this.refCard.id);

    const subs = this.cardDoc.snapshotChanges().subscribe(state => {
      this.editCard = state.payload.data();
      // this.editCard.id = state.payload.id;

      if (!this.editCard.cast) { this.editCard.cast = [0, 0, 0, 0, 0, 0]; }
      if (!this.editCard.units) { this.editCard.units = []; }

      subs.unsubscribe(); // Just take the value once
    });

  }

  public saveCard = () => {
    this.cardDoc.update(this.editCard);
    this.growl.success(`Card Updated Successfully`);
    this.activeModal.close();
  }

  public deleteCard = () => {
    this.cardDoc.delete();
    this.growl.success(`Card Deleted Successfully`);
    this.activeModal.close();
  }

  public addUnit = () => {
    const newId = this.afs.createId();
    this.confirm.open({
        title : `Add New Unit (${newId})`,
        text : `Do you confirm you want to add a new unit of "${this.editCard.name}".`,
        yesButtonText : 'Yes, add it',
    }).then((res) => {
      if (res === 'yes') {
        this.editCard.units.push(newId);
      }
    }, () => {});
  }
}
