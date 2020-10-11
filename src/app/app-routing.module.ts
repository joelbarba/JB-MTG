import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
import { LoginComponent } from './pages/login/login.component';
import { HomeComponent } from './pages/home/home.component';
import { SignInVerifyComponent } from './pages/login/sign-in-verify.component';
import {LibraryComponent} from './pages/library/library.component';

const routes: Routes = [
  { path: '', redirectTo: '/home', pathMatch: 'full' },
  { path: 'home',           component: HomeComponent },
  { path: 'login',          component: LoginComponent },
  { path: 'sign-in-verify', component: SignInVerifyComponent },
  { path: 'library',        component: LibraryComponent },
  // { path: 'user',           component: UserComponent },
  // { path: 'games-list',     component: GamesListComponent },
  // { path: 'game/:id',       component: GameComponent },
]; // RouteEnd

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
