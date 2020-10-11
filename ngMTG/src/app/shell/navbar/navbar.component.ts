import { Component, OnInit } from '@angular/core';
import { Globals } from 'src/app/core/globals.service';
import { Profile } from 'src/app/core/profile.service';

@Component({
  selector: 'app-navbar',
  templateUrl: './navbar.component.html',
  styleUrls: ['./navbar.component.scss']
})
export class NavbarComponent implements OnInit {

  constructor(
    public globals: Globals,
    public profile: Profile,
  ) { }

  ngOnInit() {
  }

  logout() {
    console.log('Loggin out');
    this.profile.logout();
  }

}
