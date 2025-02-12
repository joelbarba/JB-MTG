import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class ShellService {
  isCropperPanel = false;
  showMenu = true;
  showNavBar = true;
  scrollable = false;

  constructor() {}

  gameMode(mode: 'on' | 'off' = 'off') {
    this.showMenu = mode === 'off';
    this.showNavBar = mode === 'off';
    // this.scrollable = mode === 'off';
  }


}