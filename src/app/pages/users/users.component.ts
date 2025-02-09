import { Component, ViewEncapsulation } from '@angular/core';
import { ShellService } from '../../shell/shell.service';
import { CommonModule } from '@angular/common';
import { Firestore, QuerySnapshot, setDoc, Unsubscribe, onSnapshot, deleteDoc } from '@angular/fire/firestore';
import { collection, doc } from '@angular/fire/firestore';
import { FormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { BfConfirmService, BfGrowlService, BfListHandler, BfUiLibModule } from 'bf-ui-lib';
import { Subject } from 'rxjs';
import { Auth, createUserWithEmailAndPassword, sendEmailVerification, sendPasswordResetEmail, updatePassword, updateProfile, UserCredential } from '@angular/fire/auth';
import { TDBUser } from '../../core/types';
import { Router, RouterModule } from '@angular/router';
import { DataService } from '../../core/dataService';

const roles = [
  { code: 'admin' },
  { code: 'player' },
  { code: 'guest' },
  { code: 'disabled' },
]

@Component({
  selector: 'app-users',
  standalone: true,
  imports: [
    CommonModule,
    TranslateModule,
    FormsModule,
    BfUiLibModule,
    RouterModule,
  ],
  templateUrl: './users.component.html',
  styleUrl: './users.component.scss',
  encapsulation: ViewEncapsulation.None,
})
export class UsersComponent {
  
  usersColSub!: Unsubscribe;
  users: Array<TDBUser> = [];
  users$ = new Subject<Array<TDBUser>>();
  usersList!: BfListHandler;
  
  newUser?: Omit<TDBUser, 'uid'> & { pass: string };
  editUser?: TDBUser;

  btnDisabled = false; // Whether the create/save user button is enabled
  rolesList = [...roles];
  passCheck = '';

  constructor(
    private shell: ShellService,
    private firebaseAuth: Auth,
    public firestore: Firestore,
    public growl: BfGrowlService,
    private confirm: BfConfirmService,
    public router: Router,
    public dataService: DataService,
  ) {
    this.shell.gameMode('off');
  }

  async ngOnInit() {    
    this.usersList = new BfListHandler({
      listName      : 'users-list',
      filterFields  : ['name', 'email'],
      orderFields   : ['name'],
      orderReverse  : false,
    });
    
    await this.dataService.loadPromise;
    this.usersList.load(this.dataService.users.map(user => ({ ...user })));
    // this.dataService.users$.subscribe(users => {});

    this.prepareNewUser();
  }

  prepareNewUser() {
    this.newUser = { name: '', username: '', email: 'joel.barba.vidal@gmail.com', pass: '123456_good', sats: 100000, role: 'player', };
    this.editUser = undefined;
    this.btnDisabled = false;
  }

  // joel.barba.vidal@gmail.com
  // 123456_good
  createUser() {
    if (this.newUser) {
      // if (this.newUser.pass !== this.passCheck) { return this.growl.error('Password mismatch. Type them again'); }
      this.btnDisabled = true;

      // The new user email is always set automatically to 'joel.barba.vidal@gmail.com', so we can use the username to log in
      this.newUser.email = `joel.barba.vidal+${this.newUser.username}'@gmail.com`;

      const userDoc = { 
        name      : this.newUser.name,
        username  : this.newUser.username,
        email     : this.newUser.email,
        sats      : this.newUser.sats,
        role      : this.newUser.role,
      };
      const email = this.newUser.email;
      const pass = this.newUser.pass;      
      createUserWithEmailAndPassword(this.firebaseAuth, email, pass).then((data: UserCredential) => {
        console.log(data.user);
        updateProfile(data.user, { displayName: userDoc.name, photoURL: userDoc.username });
        // sendEmailVerification(data.user);
        setDoc(doc(this.firestore, 'users', data.user.uid), userDoc).then(docRef => {
          this.growl.success(`New user ${userDoc.name} added successfuly. UID: ${data.user.uid}`);
          setTimeout(() => {
            this.usersList.load(this.dataService.users.map(user => ({ ...user })));
            const selUser = this.dataService.users.find(u => u.uid === data.user.uid);
            if (selUser) { this.prepareEditUser(selUser); }
            this.newPass = pass;
          }, 500);
        });
      });
    }
  }

  // This is not really needed, we use unverified users
  // sendVerificationEmail() {
  //   sendEmailVerification(data.user);
  // }

  passBtnDisabled = false;
  newPass = '123456_good';

  updatePassword(newPass = '') {
    if (this.firebaseAuth.currentUser) {
      this.passBtnDisabled = true;
      console.log('Updating password to: ', newPass);
      updatePassword(this.firebaseAuth.currentUser, newPass).then(() => {
        this.growl.success(`New password set successfuly`);
        this.passBtnDisabled = false;
        this.newPass = '';
        
      }).catch((error) => {
        console.log('error', error);
        this.growl.error(`Error updating password: ` + error);
        this.passBtnDisabled = false;
      });
    }
  }

  resetPassword() {
    if (this.editUser) {
      const email = this.editUser.email;
      this.confirm.open({
        title         : 'Reset Password',
        htmlContent   : `This will reset the password for <b>${this.editUser.name}</b> and sent him a new email with a url to set a new one.`,
        noButtonText  : 'Yes, do it',
        showYes       : false,
        showNo        : true,
      }).then((res) => {
        if (res === 'no' && this.editUser) {
          sendPasswordResetEmail(this.firebaseAuth, email).then(() => {
            this.growl.success(`Password reseted and new email sent to ${email}`);
          });
        }
      }, (res) => {});
    }
  }

  deleteUser() {
    if (this.editUser) {
      this.confirm.open({
        title         : 'Delete User',
        htmlContent   : `Are you sure you want to delete user <b>${this.editUser.name}</b>?`,
        noButtonText  : 'Yes, delete it',
        showYes       : false,
        showNo        : true,
      }).then((res) => {
        if (res === 'no' && this.editUser) {
          deleteDoc(doc(this.firestore, 'users', this.editUser.uid)).then(() => {
            const text = `User ${this.editUser?.name} deleted. You should now remove it from the Firebase Auth too: https://console.firebase.google.com/project/jb-mtg/authentication/users`;
            this.growl.pushMsg({ text, timeOut: 0, msgType: 'success' });
            this.prepareNewUser();
          });
        }
      }, (res) => {});
    }
  }

  prepareEditUser(user: TDBUser) {
    this.editUser = user;
    this.btnDisabled = false;
  }

  updateUser() {
    if (this.editUser) {
      this.btnDisabled = true;
      const userDoc = { 
        name      : this.editUser.name,
        username  : this.editUser.username,
        email     : this.editUser.email,
        role      : this.editUser.role,
        sats      : this.editUser.sats,
      };
      setDoc(doc(this.firestore, 'users', this.editUser.uid), userDoc).then(docRef => {
        this.growl.success(`User ${userDoc.name} updated successfuly`);
        this.btnDisabled = false;
      });
    }
  }

}
