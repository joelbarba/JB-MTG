import { Injectable } from '@angular/core';
import { AbstractTranslateService } from 'bf-ui-lib';

@Injectable({
  providedIn: 'root'
})
export class TranslateService extends AbstractTranslateService {
  constructor() {
    // console.log('Translate service init');
    super();
  }

  doTranslate(label ?: string): string {
    // console.log('Extended translation -> ', label);
    let response;
    switch (label) {
      case 'view.common.name'         : response = 'Name'; break;
      case 'view.common.email'        : response = 'Email'; break;
      case 'view.common.username'     : response = 'User Name'; break;
      case 'view.common.placeholder'  : response = 'Placeholder'; break;
      case 'view.tooltip.message'     : response = 'This is a very useful tooltip message'; break;
      case 'view.tooltip.message2'    : response = 'This is a very useful tooltip message in a popover with two lines'; break;
      case 'view.common.yes'          : response = 'Yes'; break;
      case 'view.common.no'           : response = 'No'; break;
      case 'view.common.cancel'       : response = 'Cancel'; break;
      case 'view.modal.confirm.title' : response = 'Confirm'; break;
      case 'view.modal.confirm.text'  : response = 'Are you sure?'; break;
      default: response = label;
    }
    return response;
  }
}
