import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { TranslateService, TranslateModule } from '@ngx-translate/core';
import { BfLang, BfLangList, BfTranslateService } from './core/common/bf-translate.service';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    RouterOutlet,
    TranslateModule,
    CommonModule,
  ],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})
export class AppComponent {
  languages!: BfLangList;
  localeId$ = this.bfTranslate.localeId$;
  language$ = this.bfTranslate.language$;
  
  title = 'JB-NOTES-WEB';


  constructor(
    private translate: TranslateService,
    private bfTranslate: BfTranslateService,
  ) {
    // translate.setDefaultLang('en-ie');  // this language will be used as a fallback when a translation isn't found in the current language
    // translate.use('en-ie');             // the lang to use, if the lang isn't available, it will use the current loader to get them
  
    // translate.setTranslation('en-ie',  { 'view.title.hello': 'hello {{param1}}' }); // Add translation for 'en'
    // translate.setTranslation('cat', { 'view.title.hello': 'hola {{param1}}' });  // Add translation for 'cat'
  
    translate.get('view.title.hello', { param1: 'world' }).subscribe((res: string) => console.log(res));
  }
  
  ngOnInit() {
    this.bfTranslate.languagesPromise.then(langs => {
      this.languages = langs;
      console.log(langs);
    });
  }

  isSelected(lang: BfLang) {
    // console.log(lang, this.bfTranslate.currentLocale);
    return this.bfTranslate.currentLocale === lang.localeId;
  }

  selectLang(lang: BfLang) {
    // console.log(lang);
    this.bfTranslate.changeLanguage(lang.code);
  }
}
