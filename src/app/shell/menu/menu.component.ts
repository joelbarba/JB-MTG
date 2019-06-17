import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Location } from '@angular/common';

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
    { id: 4, name: 'Game',        icon: 'icon-finish',    isActive: false, route: 'game' },
  ];

  constructor(
    private router: Router,
    private activatedRoute: ActivatedRoute,
    private location: Location
  ) { }
  ngOnInit() {}
}
