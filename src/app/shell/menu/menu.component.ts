import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { ActivatedRoute, ActivationEnd, Router, RouterModule } from '@angular/router';
import { BfUiLibModule } from '@blueface_npm/bf-ui-lib';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { AppTranslateService } from '../../core/common/app-translate.service';
import { AuthService } from '../../core/common/auth.service';
import { ShellService } from '../shell.service';
import { filter } from 'rxjs';
import { HoverTipDirective } from '../../core/common/internal-lib/bf-tooltip/bf-tooltip.directive';

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
    HoverTipDirective,
  ]
})
export class MenuComponent {
  isAdmin = false;
  activePath: string = 'home';

  menu = [
    { name: 'Home',          path: 'home',     icon: 'icon-home',    adminOnly: false, },
    { name: 'Your Cards',    path: 'cards',    icon: 'icon-book',    adminOnly: false, },
    { name: 'Cards Library', path: 'library',  icon: 'icon-library', adminOnly: false, },
    { name: 'Shop',          path: 'shop',     icon: 'icon-toggle',  adminOnly: false, },
    { name: 'Games',         path: 'game',     icon: 'icon-flag7',   adminOnly: false, },
    { name: 'Users',         path: 'users',    icon: 'icon-users2',  adminOnly: true,  },
    { name: 'Settings',      path: 'settings', icon: 'icon-cog2',    adminOnly: true,  },
  ];


  constructor(
    private translate: TranslateService,
    private appTranslate: AppTranslateService,
    public auth: AuthService,
    public shell: ShellService,
    private route: ActivatedRoute,
    private router: Router,
  ) {
  }
  
  ngOnInit() {
    this.auth.profilePromise.then(profile => this.isAdmin = profile.isAdmin);

    // Mark the current route on the menu
    this.router.events.subscribe((routeEvent) => {
      if (routeEvent instanceof ActivationEnd) {
        this.activePath = routeEvent.snapshot.routeConfig?.path || '';
        console.log('Router - ActivationEnd End --->', this.activePath);
      }
    });
  }
}
