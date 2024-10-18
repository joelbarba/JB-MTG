import { ActivatedRoute, Router } from '@angular/router';
import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { BfGrowlService, BfLoadingBarService } from '@blueface_npm/bf-ui-lib';
import { BehaviorSubject, firstValueFrom, Observable, Subject } from 'rxjs';
import { IProfile } from './interfaces';
import { 
  Auth,
  signInWithEmailAndPassword, 
  onAuthStateChanged,
  signOut,
  UserCredential,
  User,
  UserInfo,
  updateProfile,
} from '@angular/fire/auth';


const httpOptions = { headers: new HttpHeaders({ 'Content-Type':  'application/json' }) };


@Injectable({ providedIn: 'root' })
export class AuthService {
  profilePromise: Promise<IProfile>; // Loading profile promise. This is resolved once after loading

  profile ?: IProfile;
  profile$ = new BehaviorSubject<IProfile | undefined>(undefined);

  profileUserId ?: string;
  profileUserName ?: string;

  private firebaseUser!: User;

  constructor(
    private loadingBar: BfLoadingBarService,
    private growl: BfGrowlService,
    private http: HttpClient,
    private router: Router,
    private route: ActivatedRoute,
    private auth: Auth,
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
      this.profileUserName = profile?.displayName || '';
      this.profileUserId = profile?.userId;
    });


    // profilePromise helps pages wait until the profile is first loaded.
    this.profilePromise = new Promise((resolve, reject) => {
      
      // This observable fires every time there is an Auth profile change (log in/out/app load)
      onAuthStateChanged(auth, (user) => {
        if (user) {
          console.log('Auth Session Detected');
          this.firebaseUser = user;
          const profile = this.mapProfile(user);
          this.profile$.next(profile);
          return resolve(profile);

        } else { // User is signed out
          console.log('No Auth Session');
          this.clearProfile().then(() => {
            const route = this.route.snapshot.firstChild?.routeConfig;
            if ((!route || route && route.data && !route.data['noLogin'])) { this.redirectLogin(); }
            reject();
          });
        }        
      });
    })

    this.loadingBar.run(this.profilePromise); // Run the loading spinner until profile ready
  }

  // Request log in (initiate session)
  requestLogin(username: string, password: string): Promise<IProfile | undefined> {
    const promise = signInWithEmailAndPassword(this.auth, username, password).then((data: UserCredential) => {
      console.log('User logged in', data);
      return this.mapProfile(data.user) as IProfile;
    });

    // Wait .2sec after the login, to engage the loading of the home page with the same loading bar
    this.loadingBar.run(promise.then(() => setTimeout(() => {}, 200)));
    return promise;
  }

  private mapProfile(user: UserInfo): IProfile { 
    // https://firebase.google.com/docs/reference/js/auth.user
    // console.log('token',        user.accessToken);
    // console.log('photoUrl',     user.photoURL);
    // console.log('uid',          user.uid);
    // console.log('displayName',  user.displayName);
    const profile = {
      userId      : user.uid,
      displayName : user.displayName || '',
      email       : user.email || '',
      photoURL    : user.photoURL || '',
    };
    return profile;
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

  updateProfile(data: any) {
    updateProfile(this.firebaseUser, data).then(() => {
      console.log('NAME updated');  
    });
  }


  // -----------------------------------

  // Clear all profile data
  private clearProfile() {
    return signOut(this.auth).then(() => {
      this.profile$.next(undefined);
    }).catch(error => console.error('Error with Firebase log out', error));
  }

}
