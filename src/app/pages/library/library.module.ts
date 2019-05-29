import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LibraryComponent, AddCardModalComponent, EditCardModalComponent } from './library.component';
import { GlobalsModule } from 'src/app/globals/globals.module';
import { FormsModule } from '@angular/forms'; // <-- NgModel lives here

@NgModule({
  declarations: [
    LibraryComponent,
    AddCardModalComponent,
    EditCardModalComponent,
  ],
  entryComponents: [AddCardModalComponent, EditCardModalComponent],
  imports: [
    CommonModule,
    GlobalsModule,
    FormsModule,
  ]
, exports: [LibraryComponent]
})
export class LibraryModule { }
