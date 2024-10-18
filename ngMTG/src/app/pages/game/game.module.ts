import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { GameComponent } from './game.component';
import { GlobalsModule } from 'src/app/globals/globals.module';
import { FormsModule } from '@angular/forms'; // <-- NgModel lives here
import { GameSelectHandCardComponent } from './game.component';

@NgModule({
  declarations: [GameComponent, GameSelectHandCardComponent],
  imports: [
    CommonModule,
    GlobalsModule,
    FormsModule,
  ],
  entryComponents: [GameSelectHandCardComponent],
  exports: [GameComponent]
})
export class GameModule { }
