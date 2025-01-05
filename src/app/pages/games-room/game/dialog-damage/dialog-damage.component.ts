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
]
})
export class DialogDamageComponent {
  title = 'Damage';
  youControl = false;
  opponentName = '';

  stateSub!: Subscription;
  winSub!: Subscription;

  constructor(
    private game: GameStateService,
    public cardOp: CardOpServiceNew,
    public cardEv: GameCardEventsService,
    public win: WindowsService,
  ) {}

  ngOnInit() {
    this.opponentName = this.game.playerB().name;
    this.stateSub = this.game.state$.subscribe(state => this.onUpdate());
    this.winSub = this.win.change$.subscribe(() => this.onUpdate());
    this.onUpdate();
  }


  ngOnDestroy() {
    this.stateSub?.unsubscribe();
    this.winSub?.unsubscribe();
  }

  onUpdate() {
    this.youControl = this.game.state.control === this.game.playerANum;
    // const totalMana = this.game.playerA().manaPool.reduce((a, v) => a + v, 0);
    // this.dialog = {
    //   type: 'sm',
    //   title: 'Mana burn',
    //   icon: 'icon-fire',
    //   background: 'crimson',
    //   color: 'white',
    //   text: `There is ${totalMana} unspent mana into your mana pool.<br/> It deals ${totalMana} damage to you`,
    //   buttons: [
    //     { text: 'Ok, burn it', class: 'quaternary', action: () => this.game.action('burn-mana') }
    //   ]
    // };
  }
  
}
