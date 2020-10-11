import { Component } from '@angular/core';
import { Profile } from './core/profile.service';
import { Globals } from './core/globals.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent {
  constructor(
    public profile: Profile,
    public globals: Globals,
  ) {}
}
