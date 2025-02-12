import { ActivatedRouteSnapshot, CanActivate, GuardResult, Router, RouterStateSnapshot, Routes } from '@angular/router';
import { LoginComponent } from './pages/login/login.component';
import { HomeComponent } from './pages/home/home.component';
import { SettingsComponent } from './pages/settings/settings.component';
import { GameComponent } from './pages/games-room/game/game.component';
import { LibraryComponent } from './pages/library/library.component';
import { GamesRoomComponent } from './pages/games-room/games-room.component';
import { UsersComponent } from './pages/users/users.component';
import { YourCardsComponent } from './pages/your-cards/your-cards.component';
import { LibraryCardComponent } from './pages/library/library-card/library-card.component';
import { OnboardingComponent } from './pages/onboarding/onboarding.component';
import { Injectable } from '@angular/core';
import { AuthService } from './core/common/auth.service';


@Injectable({ providedIn: 'root' })
export class AuthGuard {
  constructor(private auth: AuthService, private router: Router) {}


  async canActivate(route: ActivatedRouteSnapshot, state: RouterStateSnapshot): Promise<GuardResult> {
    await this.auth.profilePromise;
    console.log(route.routeConfig?.path, state.url);
    const url = state.url; // route.routeConfig?.path
    if (!this.auth.profileUserId) { return false; } // Prevent access to the route      
    if (this.auth.isOnboarding) {
      this.router.navigate(['/onboarding']); // Redirect
      return false;
    }
    if (this.auth.isGuest && url !== '/game/WvYPxRKiPZ4lCzuV3yHZ') {
      this.router.navigate(['/game', 'WvYPxRKiPZ4lCzuV3yHZ']);
      return false;
    }
    if (!this.auth.isAdmin) {
      if (['/users', '/settings'].indexOf(url) >= 0) {
        this.router.navigate(['/home']); return false;
      }
    }
    // if (this.auth.isGuest && url !== '/game') {
    //   this.router.navigate(['/onboarding']); // Redirect
    //   return false;
    // }
    return true; // Allow access
  }
}


export const routes: Routes = [
    { path: '', redirectTo: '/home', pathMatch: 'full' },
    { path: 'onboarding', component: OnboardingComponent, data: { label: 'page.label.onboarding', noLogin: true } },
    { path: 'login',      component: LoginComponent,      data: { label: 'page.label.login', noLogin: true } },
    { path: 'home',       component: HomeComponent,       canActivate: [AuthGuard], data: { label: 'page.label.home'  } },
    { path: 'users',      component: UsersComponent,      canActivate: [AuthGuard], data: { label: 'page.label.users' } },

    { path: 'cards', canActivate: [AuthGuard], children: [
      { path: '',               component: YourCardsComponent, data: { label: 'page.label.cards' } },
      { path: 'decks',          component: YourCardsComponent, data: { label: 'page.label.cards' } },
      { path: 'decks/:deckId',  component: YourCardsComponent, data: { label: 'page.label.cards' } },
    ]},      

    { path: 'library', canActivate: [AuthGuard], children: [    
      { path: '',        component: LibraryComponent,     data: { label: 'page.label.library' } },
      { path: ':cardId', component: LibraryCardComponent, data: { label: 'page.label.library' } },
    ]},

    { path: 'game', canActivate: [AuthGuard], children: [
      { path: '',        component: GamesRoomComponent,   data: { label: 'page.label.game' } },
      { path: ':gameId', component: GameComponent,        data: { label: 'page.label.game' } },
    ]},

    { path: 'settings', canActivate: [AuthGuard], component: SettingsComponent, data: { label: 'page.label.settings' } },
  ];


// Home
// Users
// Library
// Your Cards / Decks   icon-book
// Buy / Trade Cards    icon-toggle
// Games                icon-flag7    icon-dice

