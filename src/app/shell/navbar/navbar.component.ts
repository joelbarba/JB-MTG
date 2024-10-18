import { Component, OnDestroy, OnInit, ViewEncapsulation } from '@angular/core';
import { OAuthService } from '../../core/common/oauth.service';
import { TranslateModule } from '@ngx-translate/core';
import { CommonModule } from '@angular/common';
import { BfLangList, AppTranslateService } from '../../core/common/app-translate.service';
import { BfUiLibModule } from '@blueface_npm/bf-ui-lib';
import { BfAvatarComponent } from '../../core/common/internal-lib/bf-avatar/bf-avatar.component';
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


  constructor(
    public readonly oauth: OAuthService,
    public readonly appTranslate: AppTranslateService,
  ) {
  }

  ngOnInit() {
    // const customer$ = this.bfStore.selectedCustomer$.pipe(filter(customer => !!customer));
    this.oauth.profilePromise.then(profile => {
      console.log('PROFILE PROMISE', profile);
    })

    this.oauth.profile$.subscribe(profile => {
      this.isLoggedIn = !!profile;
      console.log('PROFILE OBSERVABLE', this.oauth.profileUserName);

      const userId = this.oauth.profile?.user_id;
      this.profileImageUrl = !!userId && !!this.oauth.profile?.avatar_id ? `api/v1/users/${userId}/avatar` : '';
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
}
