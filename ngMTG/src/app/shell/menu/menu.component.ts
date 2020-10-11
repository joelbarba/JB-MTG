import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Location } from '@angular/common';
import { Globals } from 'src/app/core/globals.service';
import { Profile } from 'src/app/core/profile.service';

@Component({
  selector: 'app-menu',
  templateUrl: './menu.component.html',
  styleUrls: ['./menu.component.scss']
})
export class MenuComponent implements OnInit {
  public menuEntries = [
    { id: 1, name: 'Home',        icon: 'icon-home',      isActive: false, route: 'home' },
    { id: 2, name: 'Library',     icon: 'icon-list',      isActive: false, route: 'library' },
    { id: 3, name: 'User',        icon: 'icon-user-plus', isActive: false, route: 'user' },
    { id: 4, name: 'Games List',  icon: 'icon-users',     isActive: false, route: 'games-list' },
    { id: 5, name: 'Game',        icon: 'icon-finish',    isActive: false, route: 'game' },
  ];

  constructor(
    public globals: Globals,
    private router: Router,
    private activatedRoute: ActivatedRoute,
    private location: Location,
    public profile: Profile,
  ) { }
  ngOnInit() {}
}
