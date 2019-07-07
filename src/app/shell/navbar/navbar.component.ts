import { Component, OnInit } from '@angular/core';
import { Profile } from 'src/app/globals/profile.service';

@Component({
  selector: 'app-navbar',
  templateUrl: './navbar.component.html',
  styleUrls: ['./navbar.component.scss']
})
export class NavbarComponent implements OnInit {

  constructor(
    private profile: Profile
  ) { }

  ngOnInit() {
  }

  logout() {
    console.log('Loggin out');
    this.profile.logout();
  }

}
