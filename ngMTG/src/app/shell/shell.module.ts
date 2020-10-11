import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NavbarComponent } from './navbar/navbar.component';
import { MenuComponent } from './menu/menu.component';
import { RouterModule } from '@angular/router';

@NgModule({
  declarations: [
    NavbarComponent, 
    MenuComponent,
  ],
  imports: [CommonModule, RouterModule],
  exports: [
    NavbarComponent, 
    MenuComponent,
  ],
})
export class ShellModule { }
