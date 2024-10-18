import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { BfUiLibModule } from '@blueface_npm/bf-ui-lib';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { BfLang, BfLangList, AppTranslateService } from '../../core/common/app-translate.service';
import { BehaviorSubject, Observable, Subject, map, take } from 'rxjs';
import { Firestore, getDocs, query, collection, collectionData, onSnapshot, where } from '@angular/fire/firestore';

export interface INote {
  id?: string;
  title: string;
  content: string;
  order: number;
  mode: 'text' | 'list';
  updated: any;
  created: any;
  notebookId?: string;
  $saved?: 'yes' | 'no' | 'saving';  // set to false while typing into the textarea, and true when saved to DB 
}

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

  notesCol = collection(this.firestore, 'notes');
  notes$ = collectionData(this.notesCol) as Observable<INote[]>;

  constructor(
    private translate: TranslateService,
    private appTranslate: AppTranslateService,
    // private af: AngularFire,
    public firestore: Firestore,
  ) {    
  }


  ngOnInit() {
    this.appTranslate.languagesPromise.then(langs => this.languages = langs);
    this.appTranslate.transReady.then(() => this.lang = this.appTranslate.currentLanguage);    
  }

  isSelected(lang: BfLang) {
    // console.log(lang, this.appTranslate.currentLocale);
    return this.appTranslate.currentLocale === lang.localeId;
  }

  selectLang(code: string) {
    if (code) { this.appTranslate.changeLanguage(code); }
  }

  myFunc(e: any) {
    console.log(e);
  }

  loadNotes() {
    // this.notes$ = this.notesCol.snapshotChanges().pipe(
    //   map(notes => notes
    //     .map(n => {
    //       const data = n.payload.doc.data() as INote;
    //       return { id: n.payload.doc.id, ...data };
    //     })
    //     .filter(n => n.id !== '0')
    //     .sort((a, b) => {
    //       if (!!a.order || !!b.order) { return (a.order || 0) > (b.order || 0) ? -1 : 1; }
    //       return a.updated > b.updated ? -1 : 1;
    //     })
    //   )
    // );
  }
}
