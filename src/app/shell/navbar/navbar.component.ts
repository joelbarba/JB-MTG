import { Component, OnInit } from '@angular/core';
import { Globals } from 'src/app/globals/globals.service';
import { Profile } from 'src/app/globals/profile.service';

@Component({
  selector: 'app-navbar',
  templateUrl: './navbar.component.html',
  styleUrls: ['./navbar.component.scss']
})
export class NavbarComponent implements OnInit {
  public isExpanded = false;

  constructor(
    private globals: Globals,
    private profile: Profile,
  ) { }

  ngOnInit() {
  }

  logout() {
    console.log('Loggin out');
    this.profile.logout();
  }

}
