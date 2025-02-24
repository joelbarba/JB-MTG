import { Component } from '@angular/core';
import { BfLangList, AppTranslateService } from '../../core/common/app-translate.service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { BfGrowlService, BfUiLibModule } from 'bf-ui-lib';
import { TranslateModule } from '@ngx-translate/core';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '../../core/common/auth.service';
import { ShellService } from '../../shell/shell.service';
import { Auth, updatePassword } from '@angular/fire/auth';
import { Firestore, doc, updateDoc } from '@angular/fire/firestore';
import { DataService } from '../../core/dataService';

@Component({
  selector    : 'app-onboarding',
  templateUrl : './onboarding.component.html',
  styleUrl    : './onboarding.component.scss',
  standalone: true,
  imports: [
    CommonModule,
    TranslateModule,
    FormsModule,
    BfUiLibModule,
  ],
})
export class OnboardingComponent {
  languages!: BfLangList;
  localeId$ = this.appTranslate.localeId$;
  language$ = this.appTranslate.language$;
  lang = '';

  username = '';
  pass = '';

  isDefaultOk: boolean | null = null;
  btnEnabled = false;

  constructor(
    private appTranslate: AppTranslateService,
    private router: Router,
    private route: ActivatedRoute,
    private firebaseAuth: Auth,
    public firestore: Firestore,
    public auth: AuthService,
    public shell: ShellService,
    public growl: BfGrowlService,
    private data: DataService,
  ) {
    this.shell.showMenu = false;
    this.shell.showNavBar = false;
  }

  // http://127.0.0.1:4200/onboarding?usr=guest&gameId=WvYPxRKiPZ4lCzuV3yHZ   White/Red
  // http://127.0.0.1:4200/onboarding?usr=guest&gameId=QqvfUu7oXeOGvUd0sD0M   Red/Green
  // http://127.0.0.1:4200/onboarding?usr=guest&gameId=YooyaaZBM6GwtDUb9SgZ   Tipus1

  ngOnInit() {
    this.username = this.route.snapshot.queryParams['usr'];
    const gameId = this.route.snapshot.queryParams['gameId'];

    // Try to log in with default cretentials
    if (this.username) {
      const email = `joel.barba.vidal+${this.username}@gmail.com`;
      const pass = `joel.barba.vidal+${this.username}@gmail.com`;
      console.log('Loggin with usr=', email, 'and password=', pass);
      this.auth.requestLogin(email, pass).then(profile => {
        console.log('LOG IN', profile);
        this.isDefaultOk = true;
        this.btnEnabled = true;

        if (this.auth.isGuest) {
          this.shell.showMenu = true;
          this.shell.showNavBar = true;
          this.router.navigate(['/game', gameId || 'WvYPxRKiPZ4lCzuV3yHZ']);
        }

      }).catch(err => {
        this.isDefaultOk = false;
        this.router.navigate(['/onboarding']);
      });

    } else {
      this.isDefaultOk = false;
    }


    // this.appTranslate.languagesPromise.then(langs => this.languages = langs);
    // this.appTranslate.transReady.then(() => this.lang = this.appTranslate.currentLanguage);
  }

  // selectLang(code: string) {
  //   this.appTranslate.changeLanguage(code);
  // }

  async setPass() {
    if (this.isDefaultOk && this.firebaseAuth.currentUser) {
      console.log('Updating password to: ', this.pass);
      this.btnEnabled = false;
      try {
        await updatePassword(this.firebaseAuth.currentUser, this.pass);
        await updateDoc(doc(this.firestore, 'users', this.auth.profileUserId), { role: 'player' })
        console.log('Password set successfully, redirecting to /home');
        this.shell.showMenu = true;
        this.shell.showNavBar = true;
        // this.auth.isOnboarding = false;
        this.growl.success(`New password set. <br>  Welcome to the Game!`);
        // this.router.navigate(['/home']);
        window.location.href = '/home'; // Force page refresh (so profile is loaded again)

      } catch(error) {
        console.log('error', error);
        this.btnEnabled = false;
        this.growl.error(`Password not valid, please try again`);
      }
    }
  }

  

  logout() {
    this.auth.requestLogout();
  }
}
