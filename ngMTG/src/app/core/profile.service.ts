import { ICard, IUser, IDeckCard, UserDeck } from 'src/typings';
import { Injectable } from '@angular/core';
import { AngularFirestore, AngularFirestoreCollection, AngularFirestoreDocument } from '@angular/fire/firestore';
import { Observable } from 'rxjs';
import { Globals } from './globals.service';
import { ActivatedRoute, Router } from '@angular/router';
import { AngularFireAuth } from '@angular/fire/auth';
import { BfGrowlService, BfConfirmService, BfDefer } from '@blueface_npm/bf-ui-lib';
import {map, take} from 'rxjs/operators';

// Extended object form user.cards[]
interface IUserCard {
  ref: string;
  card: ICard;
}


@Injectable({ providedIn: 'root' })
export class Profile {
  public userDoc: AngularFirestoreDocument<IUser>;
  public user$: Observable<IUser>;
  public userCards$: Observable<IUserCard[]>;

  public userId: string;
  public user: IUser;
  public authUser;
  public isLoggedIn = false;

  public loadingDefer = new BfDefer();
  public loadPromise = this.loadingDefer.promise;

  constructor(
    private afs: AngularFirestore,
    private afAuth: AngularFireAuth,
    private globals: Globals,
    private router: Router,
    private growl: BfGrowlService,
  ) {

    // React on auth state change
    this.afAuth.user.subscribe(user => {
      console.log('Profile ready. User -> ', user);
      if (!!user && user.emailVerified) {
        console.log('auth', user);
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
    this.afAuth.signOut().then(() => {
      console.log('OUT !!');
      this.router.navigate(['login']);
    });
  }

  public login = (user, pass) => {
    this.afAuth.signInWithEmailAndPassword(user, pass).then(data => {
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
    this.userDoc = this.afs.doc<IUser>('/users/' + this.userId);

    this.userDoc.snapshotChanges().pipe(take(1)).subscribe(state => {
      this.user = state.payload.data();
      this.loadingDefer.resolve(this.user);
    });

    this.user$ = this.userDoc.valueChanges();
    this.userCards$ = this.user$.pipe(
      map(usr => {
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
