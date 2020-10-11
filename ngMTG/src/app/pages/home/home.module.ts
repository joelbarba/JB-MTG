import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HomeComponent } from './home.component';
import { CoreModule } from 'src/app/core/core.module';

@NgModule({
  declarations: [HomeComponent],
  imports: [
    CommonModule,
    CoreModule,
  ],
  exports: [HomeComponent]
})
export class HomeModule { }
