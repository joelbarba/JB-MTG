import { NgModule } from '@angular/core';
import { LibraryComponent } from './library.component';
import {CoreModule} from '../../core/core.module';
import { EditCardModalComponent } from './edit-card-modal/edit-card-modal.component';

@NgModule({
  declarations: [
    LibraryComponent,
    // AddCardModalComponent,
    EditCardModalComponent,
    // PurchaseCardModalComponent,
  ],
  entryComponents: [
    // AddCardModalComponent,
    // EditCardModalComponent,
    // PurchaseCardModalComponent
  ],
  imports: [
    CoreModule,
  ]
, exports: [LibraryComponent]
})
export class LibraryModule { }
