import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { NavbarComponent } from './shell/navbar/navbar.component';
import { MenuComponent } from './shell/menu/menu.component';
import { ShellService } from './shell/shell.service';


@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    RouterOutlet,
    NavbarComponent,
    MenuComponent,
  ],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})
export class AppComponent {

  constructor(
    public shell: ShellService,
  ) {}
  
  ngOnInit() {
  }


}
