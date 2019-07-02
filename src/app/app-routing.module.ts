import { GameComponent } from './pages/game/game.component';
import { LibraryComponent } from './pages/library/library.component';
import { UserComponent } from './pages/user/user.component';
import { HomeComponent } from './pages/home/home.component';
import { LoginComponent } from './pages/login/login.component';

import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

const routes: Routes = [
  { path: '', redirectTo: '/home', pathMatch: 'full' },
  { path: 'home',         component: HomeComponent },
  { path: 'login',        component: LoginComponent },
  { path: 'user',     component: UserComponent },
  { path: 'library',     component: LibraryComponent },
  { path: 'game',     component: GameComponent },
]; // RouteEnd

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
