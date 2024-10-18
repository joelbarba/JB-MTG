import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HomeComponent } from './home.component';
import {BfUiLibModule} from "bf-ui-lib";

@NgModule({
  declarations: [HomeComponent],
  imports: [
    CommonModule,
    BfUiLibModule
  ],
  exports: [HomeComponent]
})
export class HomeModule { }
