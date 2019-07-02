import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { UserComponent } from './user.component';
import { AddDeckModalComponent } from './user.component';
import { EditDeckModalComponent } from './user.component';
import { GlobalsModule } from 'src/app/globals/globals.module';
import { FormsModule } from '@angular/forms'; // <-- NgModel lives here

@NgModule({
  declarations: [UserComponent, AddDeckModalComponent, EditDeckModalComponent],
  entryComponents: [AddDeckModalComponent, EditDeckModalComponent],
  imports: [
    CommonModule,
    GlobalsModule,
    FormsModule,
  ],
  exports: [UserComponent]
})
export class UserModule { }
