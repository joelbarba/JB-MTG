import { Component } from '@angular/core';
import { Profile } from 'src/app/globals/profile.service';
import { Globals } from 'src/app/globals/globals.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent {
  constructor(
    private globals: Globals,
    private profile: Profile,
  ) {}
}
