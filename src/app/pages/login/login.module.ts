import { LoginComponent } from './login.component';
import { NewUserModalComponent } from './login.component';
import { SignInVerifyComponent } from './sign-in-verify.component';
import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms'; // <-- NgModel lives here
import { CoreModule } from 'src/app/core/core.module';


@NgModule({
  declarations: [LoginComponent, NewUserModalComponent, SignInVerifyComponent],
  entryComponents: [NewUserModalComponent],
  imports: [
    CoreModule,
  ],
  exports: [LoginComponent, SignInVerifyComponent]
})
export class LoginModule { }
