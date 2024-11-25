import { Component, ViewEncapsulation } from '@angular/core';
import { AuthService } from '../../core/common/auth.service';
import { ShellService } from '../../shell/shell.service';
import { CommonModule } from '@angular/common';
import { Firestore, QuerySnapshot, QueryDocumentSnapshot, DocumentData, setDoc, updateDoc, Unsubscribe, onSnapshot, DocumentReference, DocumentSnapshot, addDoc, deleteDoc } from '@angular/fire/firestore';
import { getDocs, getDoc, collection, doc } from '@angular/fire/firestore';
import { Observable, Subject } from 'rxjs';
import { collectionData } from 'rxfire/firestore';
import { TCard } from '../../core/types';
import { FormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { BfConfirmService, BfGrowlService, BfListHandler, BfUiLibModule } from '@blueface_npm/bf-ui-lib';
import { Auth, createUserWithEmailAndPassword, sendEmailVerification, sendPasswordResetEmail, updateProfile } from '@angular/fire/auth';

export type TUser = {
  name: string;
  email: string;
  uid: string;
  isAdmin: boolean;
  isEnabled: boolean;
}

@Component({
  selector: 'app-users',
  standalone: true,
  imports: [
    CommonModule,
    TranslateModule,
    FormsModule,
    BfUiLibModule,
  ],
  templateUrl: './users.component.html',
  styleUrl: './users.component.scss',
  encapsulation: ViewEncapsulation.None,
})
export class UsersComponent {
  
  usersColSub!: Unsubscribe;
  users: Array<TUser> = [];
  users$ = new Subject<Array<TUser>>();
  usersList!: BfListHandler;
  
  newUser?: Omit<TUser, 'uid'> & { pass: string };
  editUser?: TUser;

  btnDisabled = false; // Whether the create/save user button is enabled



  constructor(
    private shell: ShellService,
    private firebaseAuth: Auth,
    public firestore: Firestore,
    public growl: BfGrowlService,
    private confirm: BfConfirmService,
  ) {
    this.shell.gameMode('off');
  }

  async ngOnInit() {
    this.loadUsers();
    this.prepareNewUser();
  }

  loadUsers() {
    this.usersList = new BfListHandler({
      data$         : this.users$,
      listName      : 'users-list',
      filterFields  : ['name', 'email'],
      orderFields   : ['name'],
      orderReverse  : false,
    });


    if (this.usersColSub) { this.usersColSub(); } // unsubscribe if previous detected

    this.usersColSub = onSnapshot(collection(this.firestore, 'users'), (snapshot: QuerySnapshot) => {
      const source = snapshot.metadata.hasPendingWrites ? 'local' : 'server';
      this.users = snapshot.docs.map(doc => {
        return { ...doc.data(), uid: doc.id } as TUser;
      });
      this.users$.next(this.users);
    });    

  }

  prepareNewUser() {
    this.newUser = { name: '', email: '', pass: '', isAdmin: false, isEnabled: false };
    this.btnDisabled = false;
  }


  createUser() {
    if (this.newUser) {
      this.btnDisabled = true;
      const userDoc = { 
        name      : this.newUser.name,
        email     : this.newUser.email,
        isAdmin   : this.newUser.isAdmin,
        isEnabled : this.newUser.isEnabled,
      };
      const email = this.newUser.email;
      const pass = this.newUser.pass;
      createUserWithEmailAndPassword(this.firebaseAuth, email, pass).then(data => {
        console.log(data.user);
        updateProfile(data.user, { displayName: userDoc.name });
        // sendEmailVerification(data.user);
        setDoc(doc(this.firestore, 'users', data.user.uid), userDoc).then(docRef => {
          this.growl.success(`New user ${userDoc.name} added successfuly. UID: ${data.user.uid}`);
          this.prepareNewUser();
        });
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
          });
        }
      }, (res) => {});
    }
  }

  prepareEditUser(user: TUser) {
    this.editUser = user;
    this.btnDisabled = false;
  }

  updateUser() {
    if (this.editUser) {
      this.btnDisabled = true;
      const userDoc = { 
        name      : this.editUser.name,
        email     : this.editUser.email,
        isAdmin   : this.editUser.isAdmin,
        isEnabled : this.editUser.isEnabled,
      };
      setDoc(doc(this.firestore, 'users', this.editUser.uid), userDoc).then(docRef => {
        this.growl.success(`User ${userDoc.name} updated successfuly`);
        this.btnDisabled = false;
      });
    }
  }

}
