import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class ShellService {
  isCropperPanel = false;
  showMenu = true;

  constructor() {}
}