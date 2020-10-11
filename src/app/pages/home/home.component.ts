import { Component, OnInit } from '@angular/core';
import { AngularFireAuth } from '@angular/fire/auth/auth';
import { Profile } from 'src/app/core/profile.service';

@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss']
})
export class HomeComponent implements OnInit {
  constructor(
    public profile: Profile,
  ) {}
  ngOnInit() {
  }

}

