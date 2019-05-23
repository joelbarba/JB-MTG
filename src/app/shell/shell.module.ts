import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NavbarComponent } from './navbar/navbar.component';
import { MenuComponent } from './menu/menu.component';
import { FooterComponent } from './footer/footer.component';

@NgModule({
  declarations: [NavbarComponent, MenuComponent, FooterComponent],
  imports: [CommonModule],
  exports: [NavbarComponent, MenuComponent, FooterComponent],
})
export class ShellModule { }
