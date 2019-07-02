import { LoginComponent } from './login.component';
import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms'; // <-- NgModel lives here
import { GlobalsModule } from 'src/app/globals/globals.module';


@NgModule({
  declarations: [LoginComponent],
  imports: [
    CommonModule,
    GlobalsModule,
    FormsModule,
  ],
  exports: [LoginComponent]
})
export class LoginModule { }
