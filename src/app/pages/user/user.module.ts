import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { UserComponent } from './user.component';
import { GlobalsModule } from 'src/app/globals/globals.module';

@NgModule({
  declarations: [UserComponent],
  imports: [
    CommonModule,
    GlobalsModule,
  ],
  exports: [UserComponent]
})
export class UserModule { }
