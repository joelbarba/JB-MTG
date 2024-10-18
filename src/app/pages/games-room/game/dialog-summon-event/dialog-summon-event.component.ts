import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { BfConfirmService, BfDnDModule, BfDnDService, BfUiLibModule } from '@blueface_npm/bf-ui-lib';
import { ISummonOp } from '../game.component';
import { GameStateService } from '../../game-state.service';

@Component({
  selector: 'dialog-summon-event',
  standalone: true,
  imports: [
    CommonModule,
    BfDnDModule,
    TranslateModule,
    FormsModule,
    BfUiLibModule,    
  ],
  templateUrl: './dialog-summon-event.component.html',
  styleUrl: './dialog-summon-event.component.scss'
})
export class DialogSummonEventComponent {
  @Input() summonOp!: ISummonOp;

  progress = 0;
  interval!: ReturnType<typeof setInterval>;
  isPaused = false;

  constructor(public game: GameStateService) {}

  ngOnInit() {
    this.init();
  }

  // Initializes the progress bar
  init() {
    if (this.interval) { clearInterval(this.interval); }
    this.interval = setInterval(() => {
      if (!this.isPaused && this.progress < 200) { this.progress += 1; }
      else { this.complete(); }
    }, 25);
  }

  pause() {
    this.isPaused = true;
  }

  continue() {
    this.isPaused = false;
  }

  complete() {
    if (this.interval) { clearInterval(this.interval); }
    console.log('No interruptions or effects, summon finalized');
    // this.game.action('summon-creature', { gId: this.summonOp.gId });
    // this.summonOp.turnOff();
  }

}
