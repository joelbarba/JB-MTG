import { HomeComponent } from './pages/home/home.component';
import { LoginComponent } from './pages/login/login.component';

import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

let routes: Routes = [];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }

routes = [
  { path: '', redirectTo: '/home', pathMatch: 'full' },
  { path: 'home',         component: HomeComponent },
  { path: 'login',        component: LoginComponent },
];
