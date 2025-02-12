import { Component, OnDestroy, OnInit, ViewEncapsulation } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { CommonModule } from '@angular/common';
import { BfLangList, AppTranslateService } from '../../core/common/app-translate.service';
import { BfGrowlModule, BfGrowlService, BfUiLibModule } from 'bf-ui-lib';
import { BfAvatarComponent } from '../../core/common/internal-lib/bf-avatar/bf-avatar.component';
import { AuthService } from '../../core/common/auth.service';
import { DataService } from '../../core/dataService';
import { Auth, sendEmailVerification, sendPasswordResetEmail, updatePassword, updateProfile, UserCredential } from '@angular/fire/auth';
// import { SubSink } from 'subsink';

@Component({
  selector: 'bf-app-navbar',
  templateUrl: './navbar.component.html',
  styleUrls: ['./navbar.component.scss'],
  encapsulation: ViewEncapsulation.None,
  standalone: true,
  imports: [
    TranslateModule,
    CommonModule,
    BfUiLibModule,
    BfAvatarComponent,
  ]
})
export class NavbarComponent implements OnInit, OnDestroy {
  // private subs = new SubSink();
  isLoggedIn = false;
  profileImageUrl?: string;
  isProfileExpanded = false;
  languages!: BfLangList;
  localeId$ = this.appTranslate.localeId$;
  language$ = this.appTranslate.language$;
  lang = '';
  displayName = '';
  username = '';
  initials = '';



  constructor(
    public readonly auth: AuthService,
    public readonly appTranslate: AppTranslateService,
    private growl: BfGrowlService,
    public dataService: DataService,    
    private firebaseAuth: Auth,
  ) {
  }

  ngOnInit() {
    // const customer$ = this.bfStore.selectedCustomer$.pipe(filter(customer => !!customer));
    this.auth.profilePromise.then(profile => {
      // console.log('PROFILE PROMISE', profile);
      this.displayName = profile.name;
      this.username = profile.username;
      this.initials = this.displayName.split(' ').map(s => s.slice(0,1)).join('').slice(0,3);
    });

    this.auth.profile$.subscribe(profile => {
      this.isLoggedIn = !!profile;
      // console.log('PROFILE OBSERVABLE', this.auth.profileName);

      const userId = this.auth.profileUserId;
      this.profileImageUrl = '';
      // this.profileImageUrl = !!userId && !!this.auth.profile?.avatar_id ? `api/v1/users/${userId}/avatar` : '';
    });

    this.appTranslate.languagesPromise.then(langs => {
      this.languages = langs;
      this.lang = this.appTranslate.currentLanguage;
      // console.log(langs);
    });
  }

  ngOnDestroy() {}
  // ngOnDestroy() { this.subs.unsubscribe(); }

  selectLang(code: string) {
    this.appTranslate.changeLanguage(code);
  }


  toggleProfile() {
    this.isProfileExpanded = !this.isProfileExpanded;
  }

  updateProfile() {
    this.auth.updateProfile({ displayName: this.displayName }).then(() => {
      this.growl.success(`Profile updated`);
    });
  }

  
  newPass = ''; // '123456_good3';
  passBtnDisabled = false;

  updatePassword(newPass = '') {
    if (this.firebaseAuth.currentUser) {
      this.passBtnDisabled = true;
      console.log('Updating password to: ', newPass);
      updatePassword(this.firebaseAuth.currentUser, newPass).then(() => {
        this.growl.success(`New password set successfuly`);
        this.passBtnDisabled = false;
        this.newPass = '';
        
      }).catch((error) => {
        console.log('error', error);
        this.growl.error(`Error updating password: ` + error);
        this.passBtnDisabled = false;
      });
    }
  }
}
