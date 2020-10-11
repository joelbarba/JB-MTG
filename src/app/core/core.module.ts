import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClientModule } from '@angular/common/http';
import { NgbModule } from '@ng-bootstrap/ng-bootstrap';
import { BfUiLibModule } from '@blueface_npm/bf-ui-lib';
import { RouterModule } from '@angular/router';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import {MtgCardComponent} from './mtg-card/mtg-card.component';


@NgModule({
  declarations: [MtgCardComponent],
  imports: [
    CommonModule,
    RouterModule,
    BfUiLibModule,
    HttpClientModule,
    NgbModule,
    FormsModule,
    ReactiveFormsModule,
  ],
  exports: [
    CommonModule,
    RouterModule,
    BfUiLibModule,
    NgbModule,
    FormsModule,
    ReactiveFormsModule,
    MtgCardComponent,
  ]
})
export class CoreModule { }
