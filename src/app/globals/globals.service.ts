import { Injectable } from '@angular/core';
import './prototypes';

@Injectable({
 providedIn: 'root'
})
export class Globals {

  public CardColors = [
    { id: 0, code: 'colorless', name: 'Colorless', img: 'mana.png' },
    { id: 1, code: 'blue',      name: 'Blue',      img: 'blueMana.png' },
    { id: 2, code: 'white',     name: 'White',     img: 'whiteMana.png' },
    { id: 3, code: 'black',     name: 'Black',     img: 'blackMana.png' },
    { id: 4, code: 'red',       name: 'Red',       img: 'redMana.png' },
    { id: 5, code: 'green',     name: 'Green',     img: 'greenMana.png' },
    { id: 6, code: 'special',   name: 'Special',   img: '' },
  ];

  public CardTypes = [
    { id: 0, code: 'land',         name: 'Land', },
    { id: 1, code: 'artifact',     name: 'Artifact', },
    { id: 2, code: 'creature',     name: 'Creature', },
    { id: 3, code: 'instant',      name: 'Instant Spell', },
    { id: 4, code: 'sorcery',      name: 'Sorcery', },
    { id: 5, code: 'interrupt',    name: 'Interrupt', },
    { id: 6, code: 'enchantment',  name: 'Enchantment', },
  ];

  constructor() {

  }

  public getColor(code) {
    return this.CardColors.find(c => c.code === code);
  }

  public getColorName(code) {
    const selObj = this.CardColors.find(c => c.code === code);
    if (!!selObj) { return selObj.name; }
    return '';
  }

  public getType(code) {
    return this.CardTypes.find(t => t.code === code);
  }

  public getTypeName(code) {
    const selObj = this.CardTypes.find(t => t.code === code);
    if (!!selObj) { return selObj.name; }
    return '';
  }
}
