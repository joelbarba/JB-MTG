import { Routes } from '@angular/router';
import { LoginComponent } from './pages/login/login.component';
import { HomeComponent } from './pages/home/home.component';
import { SettingsComponent } from './pages/settings/settings.component';
import { GameComponent } from './pages/games-room/game/game.component';
import { LibraryComponent } from './pages/library/library.component';
import { GamesRoomComponent } from './pages/games-room/games-room.component';

export const routes: Routes = [
    { path: '', redirectTo: '/home', pathMatch: 'full' },
    { path: 'login',    component: LoginComponent,      data: { label: 'page.label.login', noLogin: true } },
    { path: 'home',     component: HomeComponent,       data: { label: 'page.label.home' } },
    { path: 'game', children: [
      { path: '',        component: GamesRoomComponent,  data: { label: 'page.label.game' } },
      { path: ':gameId', component: GameComponent,       data: { label: 'page.label.game' } },
    ]},
    { path: 'library',  component: LibraryComponent,    data: { label: 'page.label.library' } },
    { path: 'settings', component: SettingsComponent,   data: { label: 'page.label.settings' } },
  ];
