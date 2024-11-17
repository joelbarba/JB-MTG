import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class BfTooltipService {
  isOn = false;
  left = -200;
  top = -200;
  currHost = '';

  text$: Subject<string> = new Subject();

  // tipStack: Array<{ id: string, left: number, top: number, text: string }> = [];

  // How high from the top of the host the tooltip is placed
  // The arrow is already 6px, so consider >= 6
  private topMargin = 12; 



  constructor() {

  }

  activate(text: string, tipId: string, rect: DOMRect) {
    if (text) {
      this.isOn = true;
      this.left = rect.left + Math.round(rect.width / 2);
      this.top = rect.top - this.topMargin;
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