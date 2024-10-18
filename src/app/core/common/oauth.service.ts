import { ActivatedRoute, Router } from '@angular/router';
import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { BfGrowlService, BfLoadingBarService } from '@blueface_npm/bf-ui-lib';
import { BehaviorSubject, firstValueFrom, Observable, Subject } from 'rxjs';
import { IProfile } from './interfaces';


const httpOptions = {
  headers: new HttpHeaders({ 'Content-Type':  'application/json' })
};

@Injectable({ providedIn: 'root' })
export class OAuthService {
  profilePromise; // Loading profile promise. This is resolved once after loading

  profile ?: IProfile;
  profile$ = new BehaviorSubject<IProfile | undefined>(undefined);

  profileUserId ?: string;
  profileUserName ?: string;

  constructor(
    private loadingBar: BfLoadingBarService,
    private growl: BfGrowlService,
    private http: HttpClient,
    private router: Router,
    private route: ActivatedRoute,
  ) {

    // Set loading bar configuration
    this.loadingBar.config({
      blockScreen : true,
      delayTime   : 0,
      showBar     : false,
      showSpinner : true,
      spinnerType : 'blueface',
      showLogs    : false,
    });

    this.profile$.subscribe(profile => {      
      this.profile = profile;
      this.profileUserName = profile ? (profile?.first_name + ' ' + profile?.last_name) : '';
      this.profileUserId = profile?.user_id;
    });


    // On load, request profile to know whether the session is ready
    this.profilePromise = this.requestProfile();
    this.loadingBar.run(this.profilePromise); // Run the loading spinner until profile ready
  }


  // First request to the flask server to know whether we hold a valid session (we are logged in)
  requestProfile() {
    if (!this.profile) {
      this.clearProfile(); 
      setTimeout(() => {
        const route = this.route.snapshot.firstChild?.routeConfig;
        if ((!route || route && route.data && !route.data['noLogin'])) { this.redirectLogin(); }
      })
    }

    return Promise.resolve(this.profile);
  }

  // Request log in (initiate session)
  requestLogin(username: string, password: string): Promise<IProfile | undefined> {
    this.profilePromise = new Promise(resolve => {
      const profile = {
        user_id:      '1234',
        username:     'joel',
        email:        'joel@barba.com',
        first_name:   'Joel',
        last_name:    'Barba',
        avatar_id:    '12345',
        country_code: 'US',
        time_zone:    'London',
      };
      this.profile$.next(profile);
      resolve(profile);
    }) as Promise<IProfile | undefined>;

    // Wait .2sec after the login, to engage the loading of the home page with the same loading bar
    this.loadingBar.run(this.profilePromise.then(() => setTimeout(() => {}, 200)));
    return this.profilePromise;
  }

  // Request log out (kill session)
  requestLogout() {
    this.clearProfile();
    this.redirectLogin(true);
    this.loadingBar.run(Promise.resolve());
  }

  // Redirect to the login page
  redirectLogin(forceReload = false) {
    if (forceReload) { // When requestLogout()
      window.location.href = '/login'; // force page reload to remove any possible remaining data
    } else {
      this.router.navigate(['/login']);
    }
  }

  // Function to check whether the current profile user has the given permission or not
  isAuth(permCode: string, minLevel?: string): boolean {
    if (!this.profile) {
      return false;
    } else {
      return true;
    }
  }


  // -----------------------------------

  // Clear all profile data
  private clearProfile() {
    this.profile$.next(undefined);
  }

}
