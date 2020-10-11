import { Injectable } from '@angular/core';
import { AbstractTranslateService } from '@blueface_npm/bf-ui-lib';
import {BehaviorSubject, Observable, Subject} from 'rxjs';
import {map} from 'rxjs/operators';

@Injectable({ providedIn: 'root' })
export class TranslateService extends AbstractTranslateService {
  public onLangChange$ = new BehaviorSubject(null);

  constructor() {
    super();
  }

  doTranslate = (label ?: string): string => label;

  getLabel$ = (label ?: string): Observable<string> => {
    return this.onLangChange$.pipe(map(v => label));
  }
}
