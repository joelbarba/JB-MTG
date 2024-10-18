import { Component, OnInit } from '@angular/core';
import { AngularFireAuth } from '@angular/fire/auth';
import { auth } from 'firebase/app';

@Component({
  selector: 'app-sign-in-verify',
  templateUrl: './sign-in-verify.component.html',
  styleUrls: ['./sign-in-verify.component.scss']
})
export class SignInVerifyComponent implements OnInit {
  public userEmail: string;

  constructor(
    public afAuth: AngularFireAuth
  ) { }

  ngOnInit() {
    console.log('app', this.afAuth.auth.app);
    console.log('currentUser', this.afAuth.auth.currentUser);



  }

  public validateUser = () => {
    console.log('eee');
    // Confirm the link is a sign-in with email link.
    if (this.afAuth.auth.isSignInWithEmailLink(window.location.href)) {

      this.userEmail = window.localStorage.getItem('jb-mtg-user-pending-confirmation');

      // The client SDK will parse the code from the link for you.
      this.afAuth.auth.signInWithEmailLink(this.userEmail, window.location.href)
        .then(function(result) {
          // Clear email from storage.
          console.log('aaaa', result);
          window.localStorage.removeItem('jb-mtg-user-pending-confirmation');
        })
        .catch(function(error) {
          console.log('error');
        });
    }
  }

}
