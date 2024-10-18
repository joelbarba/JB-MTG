import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { BfUiLibModule } from '@blueface_npm/bf-ui-lib';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { BfLang, BfLangList, AppTranslateService } from '../../core/common/app-translate.service';

@Component({
  selector: 'app-home',
  standalone: true,
  templateUrl: './home.component.html',
  styleUrl: './home.component.scss',
  imports: [
    CommonModule,
    TranslateModule,
    FormsModule,
    BfUiLibModule,
  ],
})
export class HomeComponent {
  languages!: BfLangList;
  localeId$ = this.appTranslate.localeId$;
  language$ = this.appTranslate.language$;
  lang = '';
  
  title = 'My app';
  myVariable = 'HEY';

  constructor(
    private translate: TranslateService,
    private appTranslate: AppTranslateService,
  ) {
    // translate.setDefaultLang('en-ie');  // this language will be used as a fallback when a translation isn't found in the current language
    // translate.use('en-ie');             // the lang to use, if the lang isn't available, it will use the current loader to get them
  
    // translate.setTranslation('en-ie',  { 'view.title.hello': 'hello {{param1}}' }); // Add translation for 'en'
    // translate.setTranslation('cat', { 'view.title.hello': 'hola {{param1}}' });  // Add translation for 'cat'
  
    // translate.get('view.title.hello', { param1: 'world' }).subscribe((res: string) => console.log(res));
    this.appTranslate.languagesPromise.then(langs => {
      this.languages = langs;
      this.lang = this.appTranslate.currentLanguage;
      console.log(langs);
    });
  }

  ngOnInit() {
    this.appTranslate.languagesPromise.then(langs => {
      this.languages = langs;
      console.log(langs);
    });
  }

  isSelected(lang: BfLang) {
    // console.log(lang, this.appTranslate.currentLocale);
    return this.appTranslate.currentLocale === lang.localeId;
  }

  selectLang(code: string) {
    if (code) {
      this.appTranslate.changeLanguage(code);
    }
  }

  myFunc(e: any) {
    console.log(e);
  }
}
