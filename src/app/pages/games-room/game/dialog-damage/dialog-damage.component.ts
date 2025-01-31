import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { BfDnDModule, BfUiLibModule } from 'bf-ui-lib';
import { GameStateService } from '../gameLogic/game-state.service';
import { TGameCard, TGameState } from '../../../../core/types';
import { GameCardComponent } from '../game-card/game-card.component';
import { ManaArrayComponent } from "../mana-array/mana-array.component";
import { Subscription } from 'rxjs';
import { CardOpServiceNew } from '../gameLogic/cardOp.service';
import { GameCardEventsService } from '../gameLogic/game-card-events.service';
import { WindowsService } from '../gameLogic/windows.service';


@Component({
  selector    : 'dialog-damage',
  templateUrl : './dialog-damage.component.html',
  styleUrl    : './dialog-damage.component.scss',
  standalone: true,
  imports: [
    CommonModule,
    BfDnDModule,
    TranslateModule,
    FormsModule,
    BfUiLibModule,
    GameCardComponent,
  ]
})
export class DialogDamageComponent {
  title = 'Damage';
  text = '';
  icon = '';
  youControl = false;
  yourChange = false; // Whether the life change is yours (true) or the opponent's (false)
  playerName = '';
  damage = 0; // Damage received (if < 0 = life gain)
  card?: TGameCard;

  stateSub!: Subscription;
  winSub!: Subscription;
  timeout!: ReturnType<typeof setTimeout>;

  constructor(
    private game: GameStateService,
    public cardOp: CardOpServiceNew,
    public cardEv: GameCardEventsService,
    public win: WindowsService,
  ) {}

  ngOnInit() {
    this.stateSub = this.game.state$.subscribe(state => this.onUpdate());
    this.winSub = this.win.change$.subscribe(() => this.onUpdate());
    this.onUpdate();
  }


  ngOnDestroy() {
    this.stateSub?.unsubscribe();
    this.winSub?.unsubscribe();
    if (this.timeout) { clearTimeout(this.timeout); }
  }

  onUpdate() {
    this.youControl = this.game.state.control === this.game.playerANum;

    if (this.game.state.lifeChanges.length) {
      const lifeChange = this.game.state.lifeChanges[0];
      this.yourChange = lifeChange.player === this.game.playerANum;

      this.damage = lifeChange.damage;
      this.title = lifeChange.title || 'Player Damage';
      this.icon = lifeChange.icon || '';
      this.card = this.game.state.cards.find(c => c.gId === lifeChange.gId);

      if (this.yourChange) {
        this.playerName = this.game.playerA().name;
        this.text = lifeChange.text || (lifeChange.damage > 0 ?
          `You get ${lifeChange.damage} damage` : 
          `You gain ${lifeChange.damage} life`);
      } else {
        this.playerName = this.game.playerB().name;
        this.text = lifeChange.opText || (lifeChange.damage > 0 ?
          `Your opponent gets ${lifeChange.damage} damage` : 
          `Your opponent gains ${lifeChange.damage} life`);
      }

      // If the item has "timer", auto acknowledge it after "timer" milliseconds
      if (this.timeout) { clearTimeout(this.timeout); }
      if (lifeChange.timer && this.yourChange) { this.timeout = setTimeout(() => this.acknowledge(), lifeChange.timer); }

    }

  }



  acknowledge() {
    this.game.action('acknowledge-life-change');
  }
  
}
