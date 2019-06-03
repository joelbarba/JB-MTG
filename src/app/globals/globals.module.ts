import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClientModule } from '@angular/common/http';
import { BfUiLibModule } from 'bf-ui-lib';
import { Globals } from './globals.service';
import { NgbModule } from '@ng-bootstrap/ng-bootstrap';
import { AbstractTranslateService } from 'bf-ui-lib';

class TranslateService extends AbstractTranslateService {
  constructor() { super(); }
  doTranslate(label ?: string): string { return label; }
}

@NgModule({
  declarations: [],
  providers: [Globals],
  imports: [
    CommonModule,
    HttpClientModule,
    NgbModule,
    BfUiLibModule.forRoot({ TranslateService: TranslateService  })
  ],
  exports: [
    BfUiLibModule,
    NgbModule,
  ]
})
export class GlobalsModule { }


