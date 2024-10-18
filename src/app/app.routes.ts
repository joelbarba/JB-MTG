import { Routes } from '@angular/router';
import { LoginComponent } from './pages/login/login.component';
import { HomeComponent } from './pages/home/home.component';
import { SettingsComponent } from './pages/settings/settings.component';

export const routes: Routes = [
    { path: '', redirectTo: '/home', pathMatch: 'full' },
    { path: 'login',    component: LoginComponent,      data: { label: 'page.label.login', noLogin: true } },
    { path: 'home',     component: HomeComponent,       data: { label: 'page.label.home' } },
    { path: 'settings', component: SettingsComponent,   data: { label: 'page.label.settings' } },
  ];
