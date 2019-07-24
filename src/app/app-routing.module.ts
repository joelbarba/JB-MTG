import { GamesListComponent } from './pages/games-list/games-list.component';
import { GameComponent } from './pages/game/game.component';
import { LibraryComponent } from './pages/library/library.component';
import { UserComponent } from './pages/user/user.component';
import { HomeComponent } from './pages/home/home.component';
import { LoginComponent } from './pages/login/login.component';
import { SignInVerifyComponent } from './pages/login/sign-in-verify.component';

import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

const routes: Routes = [
  { path: '', redirectTo: '/home', pathMatch: 'full' },
  { path: 'home',           component: HomeComponent },
  { path: 'login',          component: LoginComponent },
  { path: 'sign-in-verify', component: SignInVerifyComponent },
  { path: 'user',           component: UserComponent },
  { path: 'library',        component: LibraryComponent },
  { path: 'games-list',     component: GamesListComponent },
  { path: 'game/:id',       component: GameComponent },
]; // RouteEnd

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
