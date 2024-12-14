import { Routes } from '@angular/router';
import { LoginComponent } from './pages/login/login.component';
import { HomeComponent } from './pages/home/home.component';
import { SettingsComponent } from './pages/settings/settings.component';
import { GameComponent } from './pages/games-room/game/game.component';
import { LibraryComponent } from './pages/library/library.component';
import { GamesRoomComponent } from './pages/games-room/games-room.component';
import { UsersComponent } from './pages/users/users.component';
import { YourCardsComponent } from './pages/your-cards/your-cards.component';
import { LibraryCardComponent } from './pages/library/library-card/library-card.component';

export const routes: Routes = [
    { path: '', redirectTo: '/home', pathMatch: 'full' },
    { path: 'login',    component: LoginComponent,        data: { label: 'page.label.login', noLogin: true } },
    { path: 'home',     component: HomeComponent,         data: { label: 'page.label.home'  } },
    { path: 'users',    component: UsersComponent,        data: { label: 'page.label.users' } },

    { path: 'cards',    children: [
      { path: '',               component: YourCardsComponent,   data: { label: 'page.label.cards' } },
      { path: 'decks',          component: YourCardsComponent,   data: { label: 'page.label.cards' } },
      { path: 'decks/:deckId',  component: YourCardsComponent,   data: { label: 'page.label.cards' } },
    ]},      

    { path: 'library',   children: [    
      { path: '',        component: LibraryComponent,     data: { label: 'page.label.library' } },
      { path: ':cardId', component: LibraryCardComponent, data: { label: 'page.label.library' } },
    ]},

    { path: 'game',     children: [
      { path: '',        component: GamesRoomComponent,   data: { label: 'page.label.game' } },
      { path: ':gameId', component: GameComponent,        data: { label: 'page.label.game' } },
    ]},

    { path: 'settings', component: SettingsComponent,     data: { label: 'page.label.settings' } },
  ];


// Home
// Users
// Library
// Your Cards / Decks   icon-book
// Buy / Trade Cards    icon-toggle
// Games                icon-flag7    icon-dice
