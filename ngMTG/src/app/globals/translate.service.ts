import { Injectable } from '@angular/core';
import { AbstractTranslateService } from 'bf-ui-lib';
import {BehaviorSubject, Observable} from "rxjs";
import {map} from "rxjs/operators";

@Injectable({
  providedIn: 'root'
})
export class TranslateService extends AbstractTranslateService {
  public transDict = {
    'view.common.name'         : 'Name',
    'view.common.email'        : 'Email',
    'view.common.username'     : 'User Name',
    'view.common.placeholder'  : 'Placeholder',
    'view.tooltip.message'     : 'This is a very useful tooltip message',
    'view.tooltip.message2'    : 'This is a very useful tooltip message in a popover with two lines',
    'view.common.yes'          : 'Yes',
    'view.common.no'           : 'No',
    'view.common.cancel'       : 'Cancel',
    'view.modal.confirm.title' : 'Confirm',
    'view.modal.confirm.text'  : 'Are you sure?',
  };

  public transDict$ = new BehaviorSubject(this.transDict);

  constructor() {
    super();
  }

  doTranslate = (label ?: string): string => {
    return this.transDict[label] || label;
  };

  getLabel$ = (label ?: string): Observable<string> => {
    return this.transDict$.pipe(
      map(translations => {
        return translations[label] || label;
      })
    );
  }
}
