import { Component, ElementRef, EventEmitter, Inject, Input, Output, ViewChild } from '@angular/core';
import { CommonModule, DOCUMENT, ViewportScroller } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { DocumentReference, Firestore, collection, doc, getDoc, getDocs, onSnapshot, query, setDoc, DocumentData, Unsubscribe } from '@angular/fire/firestore';
import { BfConfirmService, BfGrowlService, BfUiLibModule } from 'bf-ui-lib';
import { GameStateService } from '../../game-state.service';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { TGameCard } from '../../../../core/types';
import { HoverTipDirective } from '../../../../core/common/internal-lib/bf-tooltip/bf-tooltip.directive';
import { CardOpService } from '../cardOp.service';


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
    public cardOp: CardOpService,
  ) {

  }

  ngOnInit() {
  }

  ngOnChanges() { }

  ngAfterViewInit() {}

  ngOnDestroy() {
    // if (this.stateSub) { this.stateSub.unsubscribe(); }
  }



}
