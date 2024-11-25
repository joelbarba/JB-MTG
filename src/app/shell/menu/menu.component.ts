import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { BfUiLibModule } from '@blueface_npm/bf-ui-lib';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { AppTranslateService } from '../../core/common/app-translate.service';
import { AuthService } from '../../core/common/auth.service';
import { ShellService } from '../shell.service';

@Component({
  selector: 'bf-app-menu',
  standalone: true,
  templateUrl: './menu.component.html',
  styleUrl: './menu.component.scss',
  imports: [
    TranslateModule,
    CommonModule,
    BfUiLibModule,
    RouterModule,
  ]
})
export class MenuComponent {
  isAdmin = false;

  constructor(
    private translate: TranslateService,
    private appTranslate: AppTranslateService,
    public auth: AuthService,
    public shell: ShellService,
  ) {
  }
  
  ngOnInit() {
    this.auth.profilePromise.then(profile => this.isAdmin = profile.isAdmin);
  }
}
