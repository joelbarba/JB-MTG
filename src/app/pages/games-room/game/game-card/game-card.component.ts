import { Component, ElementRef, EventEmitter, Inject, Input, Output, ViewChild } from '@angular/core';
import { CommonModule, DOCUMENT, ViewportScroller } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { DocumentReference, Firestore, collection, doc, getDoc, getDocs, onSnapshot, query, setDoc, DocumentData, Unsubscribe } from '@angular/fire/firestore';
import { BfConfirmService, BfGrowlService, BfUiLibModule } from 'bf-ui-lib';
import { GameStateService } from '../gameLogic/game-state.service';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { TGameCard } from '../../../../core/types';
import { HoverTipDirective } from '../../../../core/common/internal-lib/bf-tooltip/bf-tooltip.directive';
import { CardOpServiceNew } from '../gameLogic/cardOp.service';
import { GameCardEventsService } from '../gameLogic/game-card-events.service';
import { WindowsService } from '../gameLogic/windows.service';


@Component({
  selector: 'game-card',
  standalone: true,
  imports: [
    CommonModule,
    TranslateModule,
    FormsModule,
    BfUiLibModule,    
    HoverTipDirective,
  ],
  templateUrl: './game-card.component.html',
  styleUrl: './game-card.component.scss'
})
export class GameCardComponent {
  @Input() card!: TGameCard | null;
  @Input({ required: true }) from: 
    'deckA' | 'deckB' | 'handA' | 'handB' | 'tbleA' | 'tbleB' | 'gravA' | 'gravB' | 'stack' |
    'panelSelMana' | 'panelEffects' | 'panelGrav' | 'customDialog' | 'regenerateDialog' |
    'combatAttackerUp' | 'combatAttackerDown' | 'combatDefenderUp' | 'combatDefenderDown' |
    'upkeepDialog' | 'targetSelection' | 'damageDialog' | 'deckSelection' | 'mobDeck' |
    '' = '';
  @Input() back = false;
  @Input() count: number | null = null;
  @Input() selectable = true;
  @Input() shadow ?: { damage: number, defense: number, force: string, delta: string };

  constructor(
    public game: GameStateService,
    public router: Router,
    public firestore: Firestore,
    public growl: BfGrowlService,
    public cardOp: CardOpServiceNew,
    public cardEv: GameCardEventsService,
    public win: WindowsService,
  ) {

  }

  ngOnInit() {
  }


  isEnchantingCombatCreature = false;
  ngOnChanges() {
    this.isEnchantingCombatCreature = false;
    if (this.card?.isType('enchantment') && ['combatAttackerUp', 'combatAttackerDown', 'combatDefenderUp', 'combatDefenderDown'].indexOf(this.from) >= 0) {
      this.isEnchantingCombatCreature = !!this.game.state.cards
        .filter(c => this.card && this.card.targets.indexOf(c.gId) >= 0)
        .filter(c => c.combatStatus === 'combat:attacking' || c.combatStatus === 'combat:defending').length;
    }
  }

  ngAfterViewInit() {}

  ngOnDestroy() {
    // if (this.stateSub) { this.stateSub.unsubscribe(); }
  }

  openEffectBadge(card: TGameCard, ev: MouseEvent) {
    if (ev) { ev.stopPropagation(); }
    this.win.effectsPanel.open(card);
  }

  isSummonOp() {
    return !!this.cardOp.summonIds.find(gId => gId === this.card?.gId);
  }

  isActionSelectable() {
    return this.selectable && this.card?.selectableAction && this.cardOp.status !== 'selectingTargets';
  }

  isTargetSelectable() {
    return this.selectable && this.cardOp.status === 'selectingTargets'
      && !!this.cardOp.possibleTargets.find(gId => gId === this.card?.gId);
  }

  getHoverTip() {
    if (this.isTargetSelectable()) { return `Select target ${this.card?.name}`; }
    if (this.isActionSelectable()) { 
      if (this.cardOp.gId !== this.card?.gId) {
        return this.card?.selectableAction?.text || '';
      } else {
        return `Cancel ${this.card?.name}`;
      }
    }
    return '';
  }

}
