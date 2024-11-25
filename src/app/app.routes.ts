import { Routes } from '@angular/router';
import { LoginComponent } from './pages/login/login.component';
import { HomeComponent } from './pages/home/home.component';
import { SettingsComponent } from './pages/settings/settings.component';
import { GameComponent } from './pages/games-room/game/game.component';
import { LibraryComponent } from './pages/library/library.component';
import { GamesRoomComponent } from './pages/games-room/games-room.component';
import { UsersComponent } from './pages/users/users.component';
import { CardsComponent } from './pages/cards/cards.component';
import { ShopComponent } from './pages/shop/shop.component';

export const routes: Routes = [
    { path: '', redirectTo: '/home', pathMatch: 'full' },
    { path: 'login',    component: LoginComponent,      data: { label: 'page.label.login', noLogin: true } },
    { path: 'home',     component: HomeComponent,       data: { label: 'page.label.home' } },
    { path: 'users',    component: UsersComponent,      data: { label: 'page.label.users' } },
    { path: 'library',  component: LibraryComponent,    data: { label: 'page.label.library' } },
    { path: 'cards',    component: CardsComponent,      data: { label: 'page.label.cards' } },
    { path: 'shop',     component: ShopComponent,       data: { label: 'page.label.shop' } },
    { path: 'game', children: [
      { path: '',        component: GamesRoomComponent,  data: { label: 'page.label.game' } },
      { path: ':gameId', component: GameComponent,       data: { label: 'page.label.game' } },
    ]},
    { path: 'settings', component: SettingsComponent,   data: { label: 'page.label.settings' } },
  ];


// Home
// Users
// Library
// Your Cards / Decks   icon-book
// Buy / Trade Cards    icon-toggle
// Games                icon-flag7    icon-dice
