import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { LangChangeEvent, TranslateService} from '@ngx-translate/core';
import { BehaviorSubject, firstValueFrom, Observable, of } from 'rxjs';
import { map } from 'rxjs/operators';
// import { AbstractTranslateService, BfDefer, BfLoadingBarService } from '@blueface_npm/bf-ui-lib';
// import { wSettings } from '../../../environments/whitelabel-settings';

// -------------------------------------------------------------------------------
// -------------------------------------------------------------------------------
// TO BE REMOVED ONCE bf-ui-lib is present:

export enum IBfDeferStatus { pending = 0, resolved = 1, rejected = 2, cancelled = 3 }
export class BfDefer {
  public promise: Promise<any>;   // Native Promise
  public resolve!: Function;       // Promise resolver function
  public reject!: Function;        // Promise rejector function
  public status: IBfDeferStatus;

  constructor() {
    this.status = 0;
    this.promise = new Promise((resolve, reject) => {
      this.resolve = resolve;
      this.reject = reject;
    });

    // Set status once resolve/rejected
    this.promise.then(
      () => { if (this.status === 0) { this.status = 1; }},
      () => { if (this.status === 0) { this.status = 2; }}
    );
  }
}

const getByProp = function(array: Array<any>, property: string, value: any) {
  return array.find(item => !!item && item[property] === value);
};

const getKeyByProp = function(array: Array<any>, keyName: string, property: string, value: any) {
  const obj = array.find(item => !!item && item[property] === value);
  if (!keyName) { return obj; }
  if (!!obj && obj.hasOwnProperty(keyName)) {
    return obj[keyName];
  } else {
    return undefined;
  }
};

// -------------------------------------------------------------------------------
// -------------------------------------------------------------------------------
// -------------------------------------------------------------------------------



// Locale configs
import {registerLocaleData} from '@angular/common';
import localeEnIE from '@angular/common/locales/en-IE';
import localeEnUS from '@angular/common/locales/en';
import localeFr   from '@angular/common/locales/fr';
import localeDe   from '@angular/common/locales/de';
import localeEsES from '@angular/common/locales/es';

registerLocaleData(localeEnIE, 'en-IE');
registerLocaleData(localeEnUS, 'en-US');
registerLocaleData(localeFr,   'fr');
registerLocaleData(localeDe,   'de');
registerLocaleData(localeEsES, 'es-ES');


// Default relationship between language <-> country <-> locale
export const languageSettings = [
  { lang: 'en-ie', country: 'IE',  localeId: 'en-IE'  }, // English - IE             Ireland
  { lang: 'en-us', country: 'US',  localeId: 'en-US'  }, // English - USA            USA
  { lang: 'fr',    country: 'FR',  localeId: 'fr'     }, // French                   France
  { lang: 'de',    country: 'DE',  localeId: 'de'     }, // German                   Germany
  { lang: 'es-es', country: 'ES',  localeId: 'es-ES'  }, // Spanish - ES             Spain
];


const httpOptions = {
  headers: new HttpHeaders({ 'Content-Type':  'application/json' })
};

export type BfLangList = Array<BfLang>;
export interface BfLang {
  code: string;
  default_language: boolean;
  name: string;
  country_code: string;
  localeId: string;
}


/********************************************************
 * This is a wrapper for ngx-translate service
 * DOC: https://github.com/ngx-translate/core
********************************************************/
@Injectable({ providedIn: 'root' })
export class BfTranslateService { // extends AbstractTranslateService {
  readonly storageLocaleKey = 'NG_TRANSLATE_LANG_KEY';
  supportedLanguages: Array<BfLang> = [];    // List of supported languages
  languagesPromise: Promise<Array<BfLang>>;  // Resolves once the dynamic list of locales is loaded

  readonly fallbackLocaleId = 'en-IE';
  readonly fallbackLanguage = 'en-ie'; // Fallback dictionary. If a translation is not found for the current, use this

  currentLanguage = 'en-ie';   // This matches blueface's language code
  currentLocale = 'en-IE';     // This matches ngx-translate locale ID
  language$ = new BehaviorSubject('en-ie');
  localeId$ = new BehaviorSubject('en-IE');

  onLangChange$: Observable<{lang: string; translations: any}>;
  transReady;      // 1st load promise. You can use it to wait on loading for instant translations
  isReady = false; // True once transReady promise is resolved

  // Watch the DIs here --> This will be injected in bf-ui-lib
  constructor(
    private translate: TranslateService,
    // private loadingBar: BfLoadingBarService,
    private http: HttpClient,
  ) {
    // super();

    // Initialize the internationalization configuration
    this.onLangChange$ = this.translate.onLangChange.pipe(
      map((event: LangChangeEvent) => ({ lang: event.lang, translations: event.translations }))
    );

    const transReadyDef = new BfDefer();
    this.transReady = transReadyDef.promise;  // Resolve this on the first load

    this.translate.onLangChange.subscribe((event: LangChangeEvent) => {
      transReadyDef.resolve();
      this.isReady = true;
      const locale: BfLang = getByProp(this.supportedLanguages, 'code', event.lang);
      this.language$.next(locale.code);
      this.localeId$.next(locale.localeId);
    });

    // Load the list of supported languages
    this.languagesPromise = this.getSupportedLanguages();
    // this.loadingBar.run(this.languagesPromise);

    // Select NG_TRANSLATE_LANG_KEY
    const storedLanguage = localStorage.getItem(this.storageLocaleKey);
    if (storedLanguage) { this.changeLanguage(storedLanguage); }

    // If there is no valid stored language, determine a default one
    this.languagesPromise.then(() => {
      if (!getByProp(this.supportedLanguages, 'code', storedLanguage)) {
        this.changeLanguage(this.determineDefaultLang());
      }
    });
  }

  // Load the list of supported languages (locales)
  public getSupportedLanguages = () => {
    const languages: Array<BfLang> = [
      { country_code: 'IE', localeId: 'en-IE', code: 'en-ie', default_language: true,  name: 'English - Ireland'  },
      { country_code: 'US', localeId: 'en-US', code: 'en-us', default_language: false, name: 'English - USA'      },
      { country_code: 'FR', localeId: 'fr',    code: 'fr',    default_language: false, name: 'French'             },
      { country_code: 'DE', localeId: 'de',    code: 'de',    default_language: false, name: 'German'             },
      { country_code: 'ES', localeId: 'es-ES', code: 'es-es', default_language: false, name: 'Spanish - Spain'    },
    ];

    this.supportedLanguages = languages
      .map(lang => {
        const flagImg = lang.code.split('-').at(-1);  // Last part of language code == country code
        return { ...lang, img: 'assets/images/common/language-flags/' + flagImg + '.png' };
    });

    return Promise.resolve(this.supportedLanguages);
  };

  // Change the current locale and reload the translations dictionary
  changeLanguage = (newLang = this.currentLocale) => {
    // console.log('CHANGING LANGUAGE TO ----> ', newLang);
    this.translate.use(newLang);
    localStorage.setItem(this.storageLocaleKey, newLang);

    // Set current locale from the language
    const currentLang = getByProp(languageSettings, 'lang', newLang);
    this.currentLocale = (currentLang ? currentLang.localeId : this.fallbackLocaleId) || this.fallbackLocaleId;
  };

  // Determine a default language based on the browser/defaults/similarities
  determineDefaultLang = (): string => {
    const browserLang = (navigator.language || navigator.languages && navigator.languages[0] || '').toLowerCase();
    const supportedCodes = this.supportedLanguages.map(lang => lang.code);
    const defaultLang = this.supportedLanguages.find(lang => lang.default_language) || { code: null };
    const similarLangs = supportedCodes.filter(code => code.slice(0, 2) === browserLang.slice(0, 2));

    console.log('Browsers language', supportedCodes.find(code => code === browserLang));
    console.log('Supported default language', defaultLang.code);
    console.log('Similar supported default language', similarLangs.find(code => code === defaultLang.code));
    console.log('Similar browsers language', similarLangs[0]);

    return supportedCodes.find(code => code === browserLang)  // Browser's language
      || defaultLang.code                                     // Supported default language
      || similarLangs.find(code => code === defaultLang.code) // Similar supported default language
      || similarLangs[0]                                      // Similar browser's language
      || this.fallbackLanguage;                               // 'en-ie'
  };


  // Instant translation
  doTranslate = (label ?: string, params = {}): string => {
    let response = (label || '') + '';
    if (!!this.translate && !!this.translate.instant && !!label) {
      response = this.translate.instant(label, params);
    }
    return response;
  };

  // Returns an observable the reacts to label changes across languages
  getLabel$ = (label ?: string, params = {}): Observable<string> => {
    // console.log('getLabel$', label);
    if (label === undefined || label === null || label === '') { return of(''); }
    return this.translate.stream(label + '', params);
  };


}
