import { Directive, HostBinding, ElementRef, HostListener, Input } from '@angular/core';
import { BfTooltipService } from './bf-tooltip.service';
import { randomId } from '../../../../pages/games-room/game/gameLogic/game.utils';

@Directive({ 
  selector: '[hoverTip]',
  standalone: true,
})
export class HoverTipDirective {
  @Input('hoverTip') text = '';
  @Input('tipId') tipId = randomId('tip');

  currHost = '';

  constructor(private el: ElementRef, private tooltip: BfTooltipService) {}

  @HostListener('mouseenter', ['$event']) onMouseEnter(event: MouseEvent) {
    if (this.text) {
      this.tooltip.activate(this.text, this.tipId, this.el.nativeElement.getBoundingClientRect());
      // console.log(new Date(), 'MOUSE ENTER', 'currHost=', this.tooltip.currHost, 'tipId=', this.tipId);
      // event.preventDefault();
      // event.stopPropagation();
    }
  }

  @HostListener('mouseover', ['$event']) onMouseOver(event: MouseEvent) {
    if (this.tooltip.currHost !== this.currHost) { // When hovering back form a nested element (mouse enter was not triggered again)
      this.tooltip.activate(this.text, this.tipId, this.el.nativeElement.getBoundingClientRect());
    }
    // console.log(new Date(), 'MOUSE OVER', 'currHost=', this.tooltip.currHost, 'tipId=', this.tipId);
    event.stopPropagation();
  }

  @HostListener('mouseleave') onMouseLeave() {
    this.tooltip.deactivate(this.tipId);
    // console.log(new Date(), 'MOUSE LEAVE', 'currHost=', this.tooltip.currHost, 'tipId=', this.tipId);
  }

}