import { Card, User, DeckCard, UserDeck } from 'src/typings';
import './prototypes';
import { Injectable } from '@angular/core';
import { AngularFirestore, AngularFirestoreCollection, AngularFirestoreDocument } from '@angular/fire/firestore';
import { Observable } from 'rxjs';
import { Globals } from './globals.service';
import * as RxOp from 'rxjs/operators';
import { ActivatedRoute, Router } from '@angular/router';
import { AngularFireAuth } from '@angular/fire/auth';
import { BfGrowlService, BfConfirmService } from 'bf-ui-lib';

// Extended object form user.cards[]
interface UserCard {
  ref: string;
  card: Card;
}


@Injectable({
 providedIn: 'root'
})
export class Profile {
  public userDoc: AngularFirestoreDocument<User>;
  public user$: Observable<User>;
  public userCards$: Observable<UserCard[]>;

  public userId: string;
  public user: User;
  public authUser;
  public isLoggedIn = false;

  public loadPromise;
  public loadPromiseResolve;
  public loadPromiseReject;

  constructor(
    private afs: AngularFirestore,
    private afAuth: AngularFireAuth,
    private globals: Globals,
    private router: Router,
    private growl: BfGrowlService,
  ) {

    this.loadPromise = new Promise((resolve, reject) => {
      this.loadPromiseResolve = resolve;
      this.loadPromiseReject = reject;
    });

    // React on auth state change
    this.afAuth.user.subscribe((user) => {
      if (!!user && user.emailVerified) {
        // console.log('Profile ready. User -> ', user);
        this.authUser = user;
        this.isLoggedIn = true;
        this.iniProfile();

      } else {
        if (this.isLoggedIn) { this.logout(); }
      }
    });
  }

  public logout = () => {
    this.isLoggedIn = false;
    this.afAuth.auth.signOut().then(() => {
      console.log('OUT !!');
      this.router.navigate(['login']);
    });
  }

  public login = (user, pass) => {
    this.afAuth.auth.signInWithEmailAndPassword(user, pass).then((data) => {
      if (!data.user.emailVerified) {
        this.growl.error('User not activated. Please, check you email and use the activation link');
        this.logout();

      } else {
        this.isLoggedIn = true;
        window.localStorage.removeItem('jbmtg.emailForSignIn');
        this.router.navigate(['home']);
      }

    }).catch((error) => {
      if (error.code === 'auth/wrong-password') {
        this.growl.error('There is no user record corresponding to this identifier. The user may have been deleted.');
      } else {
        this.growl.error(error.message);
      }
    });
  }

  public iniProfile = () => {
    this.userId = this.authUser.uid;
    // this.userId = 'qINbUCQ3s1GdAzPzaIBH'; // Joel
    // this.userId = 'DygcQXEd6YCL0ICiESEq'; // Alice
    this.userDoc = this.afs.doc<User>('/users/' + this.userId);

    const subs = this.userDoc.snapshotChanges().subscribe(state => {
      const data = state.payload.data();
      this.user = data;
      this.loadPromiseResolve(this.user);
      // subs.unsubscribe();
    });

    this.user$ = this.userDoc.valueChanges();
    this.userCards$ = this.user$.pipe(
      RxOp.map(usr => {
        return usr.cards.map(cardRef => {
          const cardId = cardRef.split('.')[0];
          return {
            ref: cardRef,
            card: this.globals.getCardById(cardId)
          };
        });
      })
    );
  }




  addUnitCard = (cardId: string, cardRef: string) => {
    if (!this.user.cards) { this.user.cards = []; }
    this.user.cards.push(cardRef);
    this.userDoc.update(this.user);
  }

}
