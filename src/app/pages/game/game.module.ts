import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { GameComponent } from './game.component';
import { GlobalsModule } from 'src/app/globals/globals.module';
import { FormsModule } from '@angular/forms'; // <-- NgModel lives here

@NgModule({
  declarations: [GameComponent],
  imports: [
    CommonModule,
    GlobalsModule,
    FormsModule,
  ],
  exports: [GameComponent]
})
export class GameModule { }
