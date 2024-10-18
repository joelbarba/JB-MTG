import { Component } from '@angular/core';
import { BfLangList, AppTranslateService } from '../../core/common/app-translate.service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { BfUiLibModule } from '@blueface_npm/bf-ui-lib';
import { TranslateModule } from '@ngx-translate/core';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '../../core/common/auth.service';
import { userAuth } from '../../../../secrets';

@Component({
  selector: 'app-login',
  standalone: true,
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss',
  imports: [
    CommonModule,
    TranslateModule,
    FormsModule,
    BfUiLibModule,
  ],
})
export class LoginComponent {
  languages!: BfLangList;
  localeId$ = this.appTranslate.localeId$;
  language$ = this.appTranslate.language$;
  lang = '';

  user = userAuth.user;
  pass = userAuth.pass;

  constructor(
    private appTranslate: AppTranslateService,
    public auth: AuthService,
    private router: Router,
  ) {}


  ngOnInit() {
    this.appTranslate.languagesPromise.then(langs => this.languages = langs);
    this.appTranslate.transReady.then(() => this.lang = this.appTranslate.currentLanguage);
  }

  selectLang(code: string) {
    this.appTranslate.changeLanguage(code);
  }

  login() {
    if (!!this.user &&  this.pass) {
      this.auth.requestLogin(this.user, this.pass).then(profile => {
        console.log('LOG IN', profile);
        this.router.navigate(['/home']);
      });
    }
  }

  logout() {
    this.auth.requestLogout();
  }
}
