import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';
import { mobileCheck } from '../../commons';

@Injectable({ providedIn: 'root' })
export class BfTooltipService {
  enabled = true;
  isOn = false;
  left = -200;
  top = -200;
  currHost = '';
  tipSide: 'top' | 'right' | 'bottom' | 'left' = 'top';

  text$: Subject<string> = new Subject();

  // tipStack: Array<{ id: string, left: number, top: number, text: string }> = [];

  // How high from the top of the host the tooltip is placed
  // The arrow is already 6px, so consider >= 6
  private margin = 12; 

  constructor() {
    if (mobileCheck()) { this.enabled = false; }
  }

  // rect = rectangle of the hovering element that cause the tooltip trigger
  activate(text: string, tipId: string, tipSide: 'top' | 'right' | 'bottom' | 'left', rect: DOMRect) {
    if (this.enabled && text) {
      this.isOn = true;
      this.tipSide = tipSide;

      if (tipSide === 'right') {
        this.left = rect.right + this.margin;
        this.top = rect.top + Math.round(rect.height / 2);
      } 
      else if (tipSide === 'left') {
        this.left = rect.left - this.margin;
        this.top = rect.top + Math.round(rect.height / 2);
      }
      else if (tipSide === 'bottom') {
        this.left = rect.left + Math.round(rect.width / 2);
        this.top = rect.bottom + this.margin;
      }
      else { // tipSide === 'top' by default
        this.left = rect.left + Math.round(rect.width / 2);
        this.top = rect.top - this.margin;
      }

      this.currHost = tipId;
      this.text$.next(text);

      // if (!this.tipStack.find(v => v.id === tipId)) {
      //   this.tipStack.push({ id: tipId, left: this.left, top: this.top, text });
      //   // console.log('ADD tipStack', tipId, this.tipStack);
      // }
    }
  }

  deactivate(tipId: string) {
    this.isOn = false;
    setTimeout(() => {  // Hide the component after fade out animation
      if (!this.isOn) {
        this.text$.next('');
        this.left = -200;
        this.top = -200;
      }
    }, 500);
  }


  flush() {
    this.isOn = false;
    this.left = -200;
    this.top = -200;
    this.currHost = '';
  }

  // deactivate(tipId: string) {
  //   this.tipStack = this.tipStack.filter(v => v.id !== tipId);
  //   this.isOn = !!this.tipStack.length;
  //   // console.log('REMOVE tipStack', tipId, this.tipStack);
  //   if (this.tipStack.length) {
  //     const prevTip = this.tipStack.at(-1);
  //     if (prevTip) { 
  //       this.text$.next(prevTip.text);
  //       this.left = prevTip.left;
  //       this.top = prevTip.top;
  //     }
  //   } else { 
  //     setTimeout(() => {  // Hide the component after fade out animation
  //       if (!this.isOn) {
  //         this.text$.next('');
  //         this.left = -200;
  //         this.top = -200;
  //       }
  //     }, 500);
  //   }
    
  // }
}