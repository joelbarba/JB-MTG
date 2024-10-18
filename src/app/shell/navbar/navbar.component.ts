import { Component, OnDestroy, OnInit, ViewEncapsulation } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { CommonModule } from '@angular/common';
import { BfLangList, AppTranslateService } from '../../core/common/app-translate.service';
import { BfUiLibModule } from '@blueface_npm/bf-ui-lib';
import { BfAvatarComponent } from '../../core/common/internal-lib/bf-avatar/bf-avatar.component';
import { AuthService } from '../../core/common/auth.service';
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


  constructor(
    public readonly auth: AuthService,
    public readonly appTranslate: AppTranslateService,
  ) {
  }

  ngOnInit() {
    // const customer$ = this.bfStore.selectedCustomer$.pipe(filter(customer => !!customer));
    this.auth.profilePromise.then(profile => {
      console.log('PROFILE PROMISE', profile);
      this.displayName = profile.displayName;
    });

    this.auth.profile$.subscribe(profile => {
      this.isLoggedIn = !!profile;
      console.log('PROFILE OBSERVABLE', this.auth.profileUserName);

      const userId = this.auth.profileUserId;
      this.profileImageUrl = '';
      // this.profileImageUrl = !!userId && !!this.auth.profile?.avatar_id ? `api/v1/users/${userId}/avatar` : '';
    });

    this.appTranslate.languagesPromise.then(langs => {
      this.languages = langs;
      this.lang = this.appTranslate.currentLanguage;
      console.log(langs);
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
    this.auth.updateProfile({ displayName: this.displayName });
  }
}
