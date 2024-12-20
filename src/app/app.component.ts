import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { NavbarComponent } from './shell/navbar/navbar.component';
import { MenuComponent } from './shell/menu/menu.component';
import { ShellService } from './shell/shell.service';
import { BfGrowlModule } from 'bf-ui-lib';
import { BfTooltipComponent } from "./core/common/internal-lib/bf-tooltip/bf-tooltip.component";


@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    RouterOutlet,
    NavbarComponent,
    MenuComponent,
    BfGrowlModule,
    BfTooltipComponent
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
