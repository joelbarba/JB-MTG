import { Card, User, DeckCard, UserDeck, IGame, IGameUser, IGameCard } from 'src/typings';
import { Component, OnInit, OnDestroy } from '@angular/core';
import { AngularFirestore, AngularFirestoreCollection, AngularFirestoreDocument } from '@angular/fire/firestore';
import { AngularFireDatabase, AngularFireList } from '@angular/fire/database';
import { Globals } from 'src/app/globals/globals.service';
import { GameService } from 'src/app/globals/game.service';
import { Observable } from 'rxjs';
import { NgbModal, NgbActiveModal, ModalDismissReasons } from '@ng-bootstrap/ng-bootstrap';
import {ActivatedRoute} from '@angular/router';
import {map} from 'rxjs/operators';
import {AngularFireFunctions} from "@angular/fire/functions";
import {Profile} from "../../globals/profile.service";


@Component({
  selector: 'app-game',
  templateUrl: './game.component.html',
  styleUrls: ['./game.component.scss']
})
export class GameComponent implements OnInit, OnDestroy {
  public gameId: string;
  public game$: Observable<IGame>;
  public game: IGame; // Game snapshot
  public gameSub; // Game subscription

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

  public isMyTurn = false;      // Whether it's your turn (true) or the opponents (false)
  public isWaitingOp = false;   // Whether waiting for the opponent to finish a manual action
  public isSkipOn = false;      // Whether the finish phase button is on

  constructor(
    private globals: Globals,
    private profile: Profile,
    private gameSrv: GameService,
    private afs: AngularFirestore,
    private afd: AngularFireDatabase,
    private aff: AngularFireFunctions,
    private modal: NgbModal,
    private route: ActivatedRoute,
  ) {

  }

  public gameDoc;
  public actionsDoc;
  public game2;
  public clickTest = () => {
    console.log(new Date(), 'Calling');
    // this.gameDoc.update({ newProp: new Date() });
    this.actionsDoc = this.afs.doc('/actions/1');
    this.actionsDoc.set({ action: 'cast', cardId: '123', triggered: new Date() });
  }

  async ngOnInit() {
    this.globals.isGameMode = true;
    this.globals.collapseBars(true);

    await this.profile.loadPromise;

    // Get the game id from the url
    this.gameId = this.route.snapshot.paramMap.get('id');
    this.gameSrv.gameId = this.gameId;

    const gameDoc = this.afs.doc<IGame>('/games/' + this.gameId);
    this.game$ = gameDoc.valueChanges();


    // -------------------------------------------------------------------------------
    // Subscribe to game changes
    this.gameSub = this.game$.subscribe((game: IGame) => {
      this.gameSrv.myPlayerNum = (game.player1.userId === this.profile.userId ? 1 : 2);

      // If update from me, ignore it
      if (!!this.gameSrv.game && this.gameSrv.game.lastToken === game.lastToken) {
        return false;
      }

      console.log('GAME Refresh --------->' , game);
      this.gameSrv.game = this.gameSrv.decorateGameIn(game);
      this.game = this.gameSrv.game;


      // Start game
      if (this.game.status === 0) { // 0=Init, 1=Running
        if (this.gameSrv.myPlayerNum === 1) {
          this.gameSrv.runEngine(); // If I am the 1st player, start the game
        } else {
          // wait
          console.log('WATING.....'); // Paused on other player
        }
      }

      // Check game paused
      if (this.game.status >= 100) {
        if (!this.game.$playerMe.ready) {
          this.afterEngineStop(); // Paused on me
        }
        if (!this.game.$playerOp.ready) {
          console.log('WATING.....'); // Paused on other player
        }
      }

      this.updateView();
    });
  }

  ngOnDestroy() {
    this.gameSub.unsubscribe();
  }

  // Update view elements after running engine
  public updateView = () => {
    this.handA = this.game.$playerMe.deck.filter(dCard => dCard.loc === 'hand');
    this.playA = this.game.$playerMe.deck.filter(dCard => dCard.loc === 'play').sort((a, b) => a.playOrder > b.playOrder ? 1 : -1);
    this.deckA = this.game.$playerMe.deck.filter(dCard => dCard.loc === 'deck');
    this.gravA = this.game.$playerMe.deck.filter(dCard => dCard.loc === 'grav');

    this.handB = this.game.$playerOp.deck.filter(dCard => dCard.loc === 'hand');
    this.playB = this.game.$playerOp.deck.filter(dCard => dCard.loc === 'play').sort((a, b) => a.playOrder > b.playOrder ? 1 : -1);
    this.deckB = this.game.$playerOp.deck.filter(dCard => dCard.loc === 'deck');
    this.gravB = this.game.$playerOp.deck.filter(dCard => dCard.loc === 'grav');

    this.isMyTurn = (this.gameSrv.myPlayerNum === this.game.$turn);
    this.isWaitingOp = !this.game.$playerOp.ready;
    this.isSkipOn = this.isMyTurn && (this.game.status === 100  // play
                                   || this.game.status === 101  // combat
    );
  };

  public clickHandCard = (selCard) => {
    this.gameSrv.summonCard(this.game.$playerMe, selCard);
    this.updateView();
  };

  public tapCard = (selCard) => {
    console.log(selCard);
    this.gameSrv.tapCard(this.game.$playerMe, selCard);
    this.updateView();
  };


  public showGraveyard = (user, grav) => {
    if (grav.length) {
      const modalRef = this.modal.open(GameSelectHandCardComponent, {
        size: 'lg',
        windowClass: 'game-modal',
      });
      modalRef.componentInstance.modalTitle = `Graveyard`;
      modalRef.componentInstance.modalText = `These are the cards in the graveyard`;
      modalRef.componentInstance.cardList = grav;
      modalRef.componentInstance.maxSel = 0;
    }
  };





  public finishPhase = () => {
    this.gameSrv.finishPhase(this.game.$playerMe);
    this.afterEngineStop();
  };


  // Trigger actions after engine stops
  public afterEngineStop = () => {
    this.updateView();

    if (this.game.status === 102) { // Discard hand (end of turn and more than 7 cards)
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
        cardList.filter(c => c.isSelected).forEach(card => {
          card.loc = 'grav';
          delete card.isSelected;
        });

        this.gameSrv.finishPhase(this.game.$playerMe);
        this.updateView();
      });
    }
  };

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

