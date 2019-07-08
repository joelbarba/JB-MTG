import { Component, OnInit } from '@angular/core';
import { AngularFireAuth } from '@angular/fire/auth';
import { Globals } from 'src/app/globals/globals.service';
import { BfGrowlService, BfConfirmService } from 'bf-ui-lib';
import { auth } from 'firebase/app';
import { Profile } from 'src/app/globals/profile.service';
import { NgbModal, NgbActiveModal, ModalDismissReasons } from '@ng-bootstrap/ng-bootstrap';
import { FormGroup, FormControl, NgForm } from '@angular/forms';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss']
})
export class LoginComponent implements OnInit {

  public username: string;
  public password: string;



  constructor(
    public afAuth: AngularFireAuth,
    private profile: Profile,
    private modal: NgbModal,
  ) { }

  ngOnInit() {
    const emailForSignIn = window.localStorage.getItem('jbmtg.emailForSignIn');
    if (!!emailForSignIn) {
      this.username = emailForSignIn;
    }
  }

  public openSignIn = () => {
    // @ts-ignore
    const modalRef = this.modal.open(NewUserModalComponent, { size: 'md' });
  }


  // sendConfirmEmail() {
  //   const actionCodeSettings = {
  //     url: 'http://127.0.0.1:4200/home',
  //     handleCodeInApp: true
  //   };
  //   this.afAuth.auth.currentUser.sendEmailVerification(actionCodeSettings).then(function() {
  //     console.log('Ok, email sent');
  //   }).catch(function(error) {
  //     console.error('Ups, something went wrong', error);
  //   });
  // }

  // public sendLoginLink = () => {
  //   console.log('eee');
  //   const mailSettings = {
  //     url: 'http://127.0.0.1:4200/sign-in-verify?param1=123',
  //     handleCodeInApp: true
  //   };
  //   this.afAuth.auth.sendSignInLinkToEmail(this.newMail, mailSettings).then((resp) => {
  //     console.log('ueeeeee', resp);
  //     window.localStorage.setItem('jb-mtg-user-pending-confirmation', this.newMail);
  //   }).catch((err) => {
  //     console.log('error', err);
  //   });
  // }
}



// -----------------------------------------------------------------------------------
@Component({
  selector: 'new-user-modal',
  templateUrl: 'new-user-modal.html'
})
export class NewUserModalComponent implements OnInit {
  public status = 0; // 0=filling, 1=sent, 2=ok
  public newUser = {
    email: '',
    password1: '',
    password2: '',
    displayName: '',
    photoURL: '',
    acceptTerms: false,
  };

  constructor(
    private profile: Profile,
    public afAuth: AngularFireAuth,
    private growl: BfGrowlService,
    public activeModal: NgbActiveModal,
  ) { }

  ngOnInit() { }
  
  public createUser = () => {
    this.growl.success('New account requested');
    this.status = 1;

    this.afAuth.auth.createUserWithEmailAndPassword(this.newUser.email, this.newUser.password1).then((userCredential) => {

      // Update profile immediately after
      userCredential.user.updateProfile({ displayName : this.newUser.displayName }).then(() => {
        // Send a confirmation email
        const actionCodeSettings = {
          url: 'http://127.0.0.1:4200/login',
          handleCodeInApp: true
        };
        this.afAuth.auth.currentUser.sendEmailVerification(actionCodeSettings).then(() => {
          window.localStorage.setItem('jbmtg.emailForSignIn', this.newUser.email);
          this.status = 2;
          this.profile.logout();
          setTimeout(() => { this.activeModal.close(); }, 10000);

        }).catch((error) => {
          this.growl.error('Error sending the confirmation email');
          this.status = 0;
        });

      }, (error) => {
        this.growl.error('Error setting the new profile');
        this.status = 0;
      });

    }).catch((error) => {
      if (error.code === 'auth/weak-password') {
        this.growl.error('The password is too weak, please type a new one');
        this.newUser.password1 = '';
        this.newUser.password2 = '';
      } else {
        this.growl.error(error.message);
      }
      this.status = 0;
    });
  }


}
