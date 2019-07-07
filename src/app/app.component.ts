import { Component } from '@angular/core';
import { Profile } from 'src/app/globals/profile.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent {
  constructor(private profile: Profile) {}
}
