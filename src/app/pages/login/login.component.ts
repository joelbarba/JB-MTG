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

  public newMail: string;
  public newPass: string;

  constructor(
    public afAuth: AngularFireAuth
  ) { }

  ngOnInit() {
    console.log('app', this.afAuth.auth.app);
    console.log('currentUser', this.afAuth.auth.currentUser);

  }

  public createUser = () => {
    console.log('eee');


    this.afAuth.auth.createUserWithEmailAndPassword(this.newMail, this.newPass)
    .catch(function(error) {
    // Handle Errors here.
    var errorCode = error.code;
    var errorMessage = error.message;
    if (errorCode == 'auth/weak-password') {
    alert('The password is too weak.');
    } else {
    alert(errorMessage);
    }
    console.log(error);
    });
  }

}
