import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { GamesListComponent } from './games-list.component';
import { HttpClientModule } from '@angular/common/http';
import { GlobalsModule } from 'src/app/globals/globals.module';
import { FormsModule } from '@angular/forms'; // <-- NgModel lives here

@NgModule({
  declarations: [GamesListComponent],
  imports: [
    CommonModule,
    HttpClientModule,
    GlobalsModule,
    FormsModule,
  ]
, exports: [GamesListComponent]
})
export class GamesListModule { }
