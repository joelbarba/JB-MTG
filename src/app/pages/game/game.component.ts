import { Card, User, DeckCard, UserDeck, IGame, IGameUser, IGameCard } from 'src/typings';
import { Component, OnInit } from '@angular/core';
import { AngularFirestore, AngularFirestoreCollection, AngularFirestoreDocument } from '@angular/fire/firestore';
import { Globals } from 'src/app/globals/globals.service';
import { GameService } from 'src/app/globals/game.service';
import * as RxOp from 'rxjs/operators';
import { Observable } from 'rxjs';
import { NgbModal, NgbActiveModal, ModalDismissReasons } from '@ng-bootstrap/ng-bootstrap';
import {ActivatedRoute} from '@angular/router';



@Component({
  selector: 'app-game',
  templateUrl: './game.component.html',
  styleUrls: ['./game.component.scss']
})
export class GameComponent implements OnInit {
  public gameId: string;
  public game$: Observable<IGame>;
  public game: IGame; // Game snapshot

  public userA: IGameUser;
  public userB: IGameUser;
  public viewCard;  // Selected card to display on the big image
  public handA = []; // Turn this into pipe from game obs
  public playA = [];
  public deckA = [];
  public gravA = [];

  public handB = [];
  public playB = [];
  public deckB = [];
  public gravB = [];

  public isYourHandExp = true;  // Your hand box is expanded
  public isHisHandExp = true;   // Your hand box is expanded

  constructor(
    private globals: Globals,
    private gameSrv: GameService,
    private afs: AngularFirestore,
    private modal: NgbModal,
    private route: ActivatedRoute,
  ) {

  }

  ngOnInit() {
    this.globals.isGameMode = true;
    this.globals.collapseBars(true);

    // Get the game id from the url
    this.gameId = this.route.snapshot.paramMap.get('id');
    this.gameSrv.gameId = this.gameId;

    const gameDoc = this.afs.doc<IGame>('/games/' + this.gameId);
    this.game$ = gameDoc.valueChanges();

    // Subscribe to game changes
    this.game$.subscribe((game: IGame) => {
      this.gameSrv.state = game;
      this.game = game;

      // Decorate the game
      this.game.$userA = { ...this.game.user1 };
      this.game.$userB = { ...this.game.user2 };
      this.game.$userA.deck.forEach((deckCard: IGameCard) => {
        deckCard.$card = this.globals.getCardByRef(deckCard.ref);
      });
      this.game.$userB.deck.forEach((deckCard: IGameCard) => {
        deckCard.$card = this.globals.getCardByRef(deckCard.ref);
      });

      this.updateView();
    });
  }

  public createNewGame = () => {
    this.gameSrv.createNewGame().then((game) => {
      this.gameSrv.runEngine();
      this.updateView();
      this.viewCard = this.handA[0];
    });
  }

  // Update view elements after running engine
  public updateView = () => {
    this.handA = this.game.$userA.deck.filter(dCard => dCard.loc === 'hand');
    this.playA = this.game.$userA.deck.filter(dCard => dCard.loc === 'play').sort((a, b) => a.playOrder > b.playOrder ? 1 : -1);
    this.deckA = this.game.$userA.deck.filter(dCard => dCard.loc === 'deck');
    this.gravA = this.game.$userA.deck.filter(dCard => dCard.loc === 'grav');

    this.handB = this.game.$userB.deck.filter(dCard => dCard.loc === 'hand');
    this.playB = this.game.$userB.deck.filter(dCard => dCard.loc === 'play');
    this.deckB = this.game.$userB.deck.filter(dCard => dCard.loc === 'deck');
    this.gravB = this.game.$userB.deck.filter(dCard => dCard.loc === 'grav');
    // console.log('USER A DECK', this.game.$userA.deck);
  }

  public clickHandCard = (selCard) => {
    this.gameSrv.summonCard(selCard);
  }

  public tapCard = (selCard) => {
    console.log(selCard);
    this.gameSrv.tapCard(this.game.$userA, selCard);
    this.updateView();
  }


  public showGraveyard = (user, grav) => {
    if (grav.length) {
      const modalRef = this.modal.open(GameSelectHandCardComponent, {
        size: 'lg',
        keyboard: false,
        backdrop: 'static',
        windowClass: 'game-modal',
      });
      modalRef.componentInstance.modalTitle = `Graveyard`;
      modalRef.componentInstance.modalText = `These are the cards in the graveyard`;
      modalRef.componentInstance.cardList = grav;
      modalRef.componentInstance.maxSel = 0;
    }
  }





  public finishPhase = () => {
    this.gameSrv.runEngine(true);
    this.updateView();
    this.engineStop();
  }


  // Trigger actions after engine stops
  public engineStop = () => {
    if (this.game.status === 2) {
      const modalRef = this.modal.open(GameSelectHandCardComponent, {
        size: 'lg',
        keyboard: false,
        backdrop: 'static',
        windowClass: 'game-modal',
      });
      modalRef.componentInstance.modalTitle = 'Discard Phase';
      modalRef.componentInstance.modalText = `You cannot finish the turn with more than 7 cards on your hand.`;
      modalRef.componentInstance.modalText += `Please select those you want to discard of`;
      modalRef.componentInstance.cardList = this.handA;
      modalRef.componentInstance.maxSel = this.handA.length - 7;
      modalRef.componentInstance.minSel = this.handA.length - 7;

      modalRef.result.then((cardList) => {
        // Move selected cards to the graveyard
        cardList.filter(c => c.isSelected).forEach(card => { card.loc = 'grav'; card.isSelected = false; });

        this.updateView();
        this.gameSrv.runEngine(true);
        this.updateView();
      });
    }
  }

}




// -----------------------------------------------------------------------------------
@Component({
  selector: 'game-select-hand-card-modal',
  templateUrl: 'select-hand-card.modal.html'
})
export class GameSelectHandCardComponent implements OnInit {
  public modalTitle: string;
  public modalText: string;
  public cardList;
  public isOkEnabled = false;
  public maxSel = null;
  public minSel = null;

  constructor(
    private globals: Globals,
    public activeModal: NgbActiveModal,
  ) { }

  ngOnInit() {
    const sel = this.cardList.filter(c => c.isSelected).length;
    this.isOkEnabled = (this.maxSel === null || sel <= this.maxSel)
                    && (this.minSel === null || sel >= this.minSel);
  }

  public selectCard = (card) => {
    const sel = this.cardList.filter(c => c.isSelected).length;

    const inc = !card.isSelected;
    const nextSel =  inc ? sel + 1 : sel - 1;

    if ( inc && this.maxSel !== null && nextSel > this.maxSel) { return false; }
    // if (!inc && this.minSel !== null && nextSel < this.minSel) { return false; }

    card.isSelected = !card.isSelected;

    this.isOkEnabled = (this.maxSel === null || nextSel <= this.maxSel)
                    && (this.minSel === null || nextSel >= this.minSel);
  }

  public clickOk = () => {
    this.activeModal.close(this.cardList);
  }

}

