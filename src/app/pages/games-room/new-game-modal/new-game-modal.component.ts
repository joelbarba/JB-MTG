import { CommonModule, formatNumber } from "@angular/common";
import { Component } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { BfConfirmService, BfGrowlService, BfListHandler, BfUiLibModule } from "bf-ui-lib";
import { NgbActiveModal } from "@ng-bootstrap/ng-bootstrap";
import { TranslateModule } from "@ngx-translate/core";
import { MtgCardComponent } from "../../../core/common/internal-lib/mtg-card/mtg-card.component";
import { DataService, TFullDeck } from "../../../core/dataService";
import { TDBUser } from "../../../core/types";
import { AuthService } from "../../../core/common/auth.service";

type TDeckItem = { id: string; name: string; };

@Component({
  selector: 'modal-new-game',
  standalone: true,
  imports: [
    CommonModule,
    TranslateModule,
    FormsModule,
    BfUiLibModule,
    // MtgCardComponent,
    // HoverTipDirective,
  ],
  templateUrl: './new-game-modal.component.html',
  styleUrls: ['./new-game-modal.component.scss'],
})
export class NewGameModalComponent {
  deckNamesList: Array<string> = [];

  usersList = new BfListHandler({
    listName      : 'users-list',
    filterFields  : ['name', 'email'],
    orderFields   : ['name'],
    rowsPerPage   : 8,
  });

  decksList = new BfListHandler({
    listName      : 'decks-list',
    filterFields  : ['name'],
    orderFields   : ['name'],
    rowsPerPage   : 8,
  });

  selectedUser?: TDBUser;
  selectedDeck?: TDeckItem;
  blockPr!: Promise<void>;

  gameId    ?: string;   // If set, you are accepting a request
  playerName?: string;   // If set, you are accepting a request

  constructor(
    private ngbModal: NgbActiveModal,
    private auth: AuthService,
    private dataService: DataService,
    private growl: BfGrowlService,
    private confirm: BfConfirmService,
  ) {}

  async ngOnInit() {
    await this.dataService.loadPromise;    
    this.usersList.load(this.dataService.users.filter(u => u.uid !== this.auth.profileUserId));
    
    this.dataService.yourDecks$.subscribe(decks => {
      this.decksList.load(decks.map(deck => ({ id: deck.id, name: deck.deckName })));
    });
  }


  async createRequest() {
    if (this.selectedUser && this.selectedDeck && this.auth.profileUserId && this.auth.profileName) {
      const player1 = {
        id: this.auth.profileUserId,
        name: this.auth.profileName,
        deckId: this.selectedDeck.id
      };
      const error = await this.dataService.requestNewGame(player1, this.selectedUser.uid);
      if (error) { return this.growl.error(error); }
      this.growl.success(`A new game request has been placed. Wait for ${this.selectedUser.name} to accept it.`);
      this.ngbModal.close({ userId: this.selectedUser?.uid, deckId: this.selectedDeck?.id });
    }
  }

  async createGame() { 
    if (this.selectedDeck && this.gameId) {
      this.growl.success(`Starting a new game with ${this.playerName}`);
      const error = await this.dataService.createNewGame(this.gameId, this.selectedDeck.id);
      if (error) { return this.growl.error(error); }
      this.ngbModal.close({ deckId: this.selectedDeck?.id });
    }
  }

  close() { this.ngbModal.close(); }
}