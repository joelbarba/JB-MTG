import { Injectable } from '@angular/core';
import { TranslateLoader } from '@ngx-translate/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { firstValueFrom, Observable, Subject } from 'rxjs';
import { BfLang } from './app-translate.service';
import { BfLoadingBarService } from '@blueface_npm/bf-ui-lib';


// const httpOptions = { headers: new HttpHeaders({ 'Content-Type':  'application/json' }) };

type TDictionary = { [key: string]: string }; // Object with label:text mapping

/*************************************************************************************************
 * Hook up the ngx-translate loader with getTranslation(), to load the dictionaries dynamically
 ************************************************************************************************/
@Injectable({ providedIn: 'root' })
export class AppTranslateLoader implements TranslateLoader {
  public loader$: { [key: string]: Subject<TDictionary> } = {}; // Collection of loaders (one per lang) to return

  // Watch the DIs here --> This will be injected in bf-ui-lib
  constructor(
    private http: HttpClient,
    private loadingBar: BfLoadingBarService,
  ) { }

  getTranslation(lang: string): Observable<any> {
    // console.log('getTranslation', lang);
    return this.loader$[lang] || this.loadTranslations(lang);
  }

  loadTranslations = (lang: string) => { // lang = blueface language code
    let transDict: TDictionary = {};
    if (lang === 'undefined') { lang = 'en-ie'; }
    const lcLang = lang.toLowerCase();
    const dictKey = `jb-${lcLang}-dictionary`; // jb-en-ie-dictionary

    // Check if the dictionary is cached in localstorage
    const storedDict = localStorage.getItem(dictKey);
    if (!!storedDict) { transDict = JSON.parse(storedDict); } // Load dictionary from localstorage

    console.log(`Loading translations for '${lang}'`);
    this.loader$[lang] = new Subject();

    const defaultLangPromise = import('./translations/english').then(m => m.DICTIONARY_EN_IE);
    let loadPromise = Promise.resolve({});

    switch (lang) {
      case('es-es'): loadPromise = import('./translations/spanish').then(m => m.DICTIONARY_ES_ES); break;
    }

    Promise.all([defaultLangPromise, loadPromise]).then(([default_dict, dict]) => {
      transDict = { ...default_dict, ...dict } as TDictionary;
      localStorage.setItem(dictKey, JSON.stringify(transDict)); // Save the current cached values
      this.loader$[lang].next(transDict);
      this.loader$[lang].complete();
      return transDict;
    });

    this.loadingBar.run(loadPromise);

    return this.loader$[lang];
  }
}
