import { Component, OnInit } from '@angular/core';
import { AngularFireAuth } from '@angular/fire/auth';
import { auth } from 'firebase/app';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss']
})
export class LoginComponent implements OnInit {

  public username: string;
  public password: string;

  public newUser = {
    email: 'joel.barba.vidal@gmail.com',
    password: '',
    displayName: '',
    photoURL: '',
  };
  public newMail: string = 'joel.barba.vidal@gmail.com';
  public newPass: string;

  constructor(
    public afAuth: AngularFireAuth
  ) { }

  ngOnInit() {
    console.log('app', this.afAuth.auth.app);
    console.log('currentUser', this.afAuth.auth.currentUser);

  }

  public createUser = () => {
    this.afAuth.auth.createUserWithEmailAndPassword(this.newUser.email, this.newUser.password).then((userCredential) => {
      // Update profile too
      userCredential.user.updateProfile({
        displayName : this.newUser.displayName,
        photoURL    : this.newUser.photoURL
      }).then(() => {}, (error) => {});

    }).catch(function(error) {
      // Handle Errors here.
      const errorCode = error.code;
      const errorMessage = error.message;
      if (errorCode === 'auth/weak-password') {
        alert('The password is too weak.');
      } else {
        alert(errorMessage);
      }
      console.log(error);
    });
  };

  public logIn = () => {
    this.afAuth.auth.signInWithEmailAndPassword(this.username, this.password).then(() => {
      console.log('LOOOOOGED in !!!');
    })
      .catch(function(error) {
        // Handle Errors here.
        const errorCode = error.code;
        const errorMessage = error.message;
        if (errorCode === 'auth/wrong-password') {
          alert('Wrong password.');
        } else {
          alert(errorMessage);
        }
        console.log(error);
      });
  };

  public logOut = () => {
    this.afAuth.auth.signOut().then(() => {
      console.log('OUT !!');
    });
  };




  public sendLoginLink = () => {
    console.log('eee');
    const mailSettings = {
      url: 'http://127.0.0.1:4200/sign-in-verify?param1=123',
      // url: 'http://reikiwithinyou.com/jbmtg/sign-in-verification?param1=123',
      handleCodeInApp: true
    };
    this.afAuth.auth.sendSignInLinkToEmail(this.newMail, mailSettings).then((resp) => {
      console.log('ueeeeee', resp);
      window.localStorage.setItem('jb-mtg-user-pending-confirmation', this.newMail);
    }).catch((err) => {
      console.log('error', err);
    });
  }
}
