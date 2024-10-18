import { Component, ViewEncapsulation } from '@angular/core';
import { AuthService } from '../../core/common/auth.service';
import { ShellService } from '../../shell/shell.service';
import { CommonModule } from '@angular/common';
import { BfDnDModule, BfDnDService } from '@blueface_npm/bf-ui-lib';

export interface ICard {
  img: string;
  posX?: number;
  posY?: number;
  zInd?: number;
}

@Component({
  selector: 'app-game',
  standalone: true,
  imports: [
    CommonModule,
    BfDnDModule,
  ],
  templateUrl: './game.component.html',
  styleUrl: './game.component.scss',
  encapsulation: ViewEncapsulation.None,
})
export class GameComponent {

  fullCardImg = 'taiga.jpg';

  handA = [
    { img: 'gray_ogre.jpg' },
    { img: 'mountain.jpg' },
    { img: 'mox_ruby.jpg' },
    { img: 'lightning_bolt.jpg' },
    { img: 'plains.jpg' },
    { img: 'lightning_bolt.jpg' },
    { img: 'mountain.jpg' },
  ];
  playA = [
    { posX: 100, posY: 30, zInd: 100, img: 'forest.jpg' },
    { posX: 250, posY: 30, zInd: 101, img: 'mountain.jpg' },
    { posX: 400, posY: 30, zInd: 102, img: 'mox_ruby.jpg' },
    { posX: 550, posY: 30, zInd: 103, img: 'mox_jet.jpg' },
    { posX: 700, posY: 30, zInd: 104, img: 'shivan_dragon.jpg' },
  ];
  playB = [
    { posX: 100, posY: 30, zInd: 100, img: 'forest.jpg' },
    { posX: 250, posY: 30, zInd: 101, img: 'mountain.jpg' },
    { posX: 400, posY: 30, zInd: 102, img: 'mox_ruby.jpg' },
    { posX: 550, posY: 30, zInd: 103, img: 'mox_jet.jpg' },
    { posX: 700, posY: 30, zInd: 104, img: 'shivan_dragon.jpg' },
  ];

  isHandBExp = true;
  isHandAExp = true;

  constructor(
    public auth: AuthService,
    public shell: ShellService,
    public bfDnD: BfDnDService,
  ) {
    this.shell.showMenu = false;
  }

  ngOnInit() {
    this.autoPositionGameCards();
  }

  autoPositionGameCards() {
    console.log('autoPositionGameCards');
    this.playA.forEach((card, ind) => {
      card.posY = 20;
      card.posX = 20 + (ind * 135);
      card.zInd = 100 + ind;
    });
    this.playB.forEach((card, ind) => {
      card.posY = 400;
      card.posX = 20 + (ind * 135);
      card.zInd = 100 + ind;
    });
  }


  movingCard: { card: ICard, height: number, width: number } | null = null;
  dragStart(ev: any, card: ICard) {
    this.movingCard = { card, 
      width: ev.srcElement.width,
      height: ev.srcElement.height
    };
  }

  moveCardPosition(ev: any) {
    if (this.movingCard) {
      ev.bfDraggable.posX = Math.round(ev.position.x - (this.movingCard.width / 2) - 8);
      ev.bfDraggable.posY = Math.round(ev.position.y - (this.movingCard.height / 2) - 7);
      this.focusPlayCard(this.movingCard.card);
      this.movingCard = null;
    }
  }

  // Recalculate the z-index so the card gets on top of all others
  focusPlayCard(card: ICard) {
    const currentZInd = card.zInd || 0;
    this.playA.filter(c => c.zInd > currentZInd).forEach(c => c.zInd--);
    card.zInd = 100 + this.playA.length - 1;
  }

}
