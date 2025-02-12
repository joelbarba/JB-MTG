import { ActivatedRoute, Router } from '@angular/router';
import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { BfDefer, BfGrowlService, BfLoadingBarService } from 'bf-ui-lib';
import { BehaviorSubject, firstValueFrom, Observable, Subject } from 'rxjs';
import { doc, Firestore, getDoc, updateDoc } from '@angular/fire/firestore';
import { 
  Auth,
  signInWithEmailAndPassword, 
  onAuthStateChanged,
  signOut,
  UserCredential,
  User,
  UserInfo,
  updateProfile,
  updateEmail,
  updatePassword,
} from '@angular/fire/auth';
import { TDBUser } from '../types';


const httpOptions = { headers: new HttpHeaders({ 'Content-Type':  'application/json' }) };


@Injectable({ providedIn: 'root' })
export class AuthService {
  authLoadPromise: Promise<TDBUser>; // Loading profile promise. This is resolved once after loading

  private profileDefer = new BfDefer();
  profilePromise: Promise<TDBUser> = this.profileDefer.promise; // It resolves once a valid profile is loaded (login or load)


  profile ?: TDBUser;
  profile$ = new BehaviorSubject<TDBUser | undefined>(undefined);

  profileUserId = ''; // = profile.uid
  profileName = '';   // = profile.name
  username = '';      // = profile.username
  isAdmin = false;    // role = 'admin'
  isGuest = false;    // role = 'guest'
  isEnabled = true;   // role != 'disabled'
  isOnboarding = true; // role != 'onboarding'

  firebaseUser!: User;

  constructor(
    private loadingBar: BfLoadingBarService,
    private growl: BfGrowlService,
    private http: HttpClient,
    private router: Router,
    private route: ActivatedRoute,
    private firebaseAuth: Auth,
    public firestore: Firestore,
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
      this.profileUserId = profile?.uid || '';
      this.profileName = profile?.name || '';
      if (profile && this.profileDefer.status === 0) { this.profileDefer.resolve(profile); }
    });


    this.authLoadPromise = new Promise((resolve, reject) => {
      
      // This observable fires every time there is an Auth profile change (log in/out/app load)
      onAuthStateChanged(this.firebaseAuth, (user) => {
        if (user) {
          console.log('Auth Session Detected. You are:', user.displayName);
          // updateEmail(user, 'joel.barba.vidal+joel@gmail.com');
          this.firebaseUser = user;
          this.mapProfile(user).then(profile => {
            if (profile.role === 'disabled') { reject(); } 
            else {
              this.profile$.next(profile);
              return resolve(profile);
            }
          });

        } else { // User is signed out
          console.log('No Auth Session');
          this.clearProfile().then(() => {
            const route = this.route.snapshot.firstChild?.routeConfig;
            if ((!route || route && route.data && !route.data['noLogin'])) { this.redirectLogin(); }
            reject();
          });
        }        
      });
    });

    this.loadingBar.run(this.authLoadPromise); // Run the loading spinner until profile ready
  }

  // Request log in (initiate session)
  async requestLogin(username: string, password: string): Promise<TDBUser | undefined> {
    const data = await signInWithEmailAndPassword(this.firebaseAuth, username, password)    
    const profile = await this.mapProfile(data.user);
    console.log('User logged in - Profile =', profile);
    return profile;
    // Wait .2sec after the login, to engage the loading of the home page with the same loading bar
    // this.loadingBar.run(promise.then(() => setTimeout(() => {}, 200)));
    // return promise;
  }

  private async mapProfile(user: UserInfo): Promise<TDBUser> { 
    // https://firebase.google.com/docs/reference/js/auth.user
    // console.log('token',        user.accessToken);
    // console.log('photoUrl',     user.photoURL);
    // console.log('uid',          user.uid);
    // console.log('displayName',  user.displayName);
    const profile: TDBUser = {
      uid       : user.uid,
      username  : '',
      name      : user.displayName || '',
      email     : user.email || '',
      sats      : 0,
      role      : 'player',
    };

    // Fetch /users document and add the custom data
    const docSnap = await getDoc(doc(this.firestore, 'users', user.uid));
    if (docSnap.exists()) {
      const data = docSnap.data() as TDBUser;
      profile.username  = data.username;
      profile.name      = data.name;
      profile.email     = data.email;
      profile.role      = data.role;
      profile.sats      = data.sats;
    }

    this.isAdmin   = profile.role === 'admin';
    this.isGuest   = profile.role === 'guest';
    this.isEnabled = profile.role !== 'disabled';
    this.isOnboarding = profile.role === 'onboarding';

    if (!this.isEnabled) { this.requestLogout(); }

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

  async updatePassword(newPass = '') {

  }

  async updateProfile(data: any): Promise<void> {
    if (this.profileUserId) { 
      await updateDoc(doc(this.firestore, 'users', this.profileUserId), data); 
      await updateProfile(this.firebaseUser, data);
    }
  }

  async spendSats(statsSpent: number) {
    if (this.profile && this.profile.sats >= statsSpent) {
      this.profile.sats -= statsSpent;
      await updateDoc(doc(this.firestore, 'users', this.profile.uid), { sats: this.profile.sats });
      this.profile$.next(this.profile);
      // this.growl.success(`${this.card?.name} bought for ${price} sats`);
    }
  }

  // -----------------------------------

  // Clear all profile data
  private clearProfile() {
    return signOut(this.firebaseAuth).then(() => {
      this.profile$.next(undefined);
    }).catch(error => console.error('Error with Firebase log out', error));
  }

}
