echo "Init an Angular 7 Project with the following:"
echo "  1. Bootstrap 4"
echo "  2. IcoMoon"
echo "  3. Bf-UI-lib"
echo "  4. Basic app folder structure + default files"
echo ""
echo "------------------------------------------------"
# echo "  1. Install Bootstrap 4 and inject it in styles.scss"
# read x
# npm install bootstrap@4  --save
# echo '@import "scss/variables.scss";' > src/styles.scss
# echo '@import "~bootstrap/dist/css/bootstrap.css";' >> src/styles.scss


# echo ""
# echo "----------------------------------------------------------"
# echo "  2. Import icomoon from npm (https://www.npmjs.com/package/bf-icomoon)"
# read x
# npm install bf-icomoon --save
# echo '@import "~bf-icomoon/css/icomoon.css";' >> src/styles.scss
# echo '@import "scss/layout.scss";' >> src/styles.scss



# echo ""
# echo "----------------------------------------------------------"
# echo "  3. Bf-UI-lib"
# read x
# npm install bf-ui-lib

echo ""
echo "----------------------------------------------------------"
echo "  4. Basic app folder structure:"
echo "     - scss"
echo "        * variables.scss"
echo "        * layout.scss"
echo "     - app"
echo "        - globals"
echo "        - pages"
echo "           * login"
echo "           * home"
echo "        - shell"
echo "           * menu"
echo "           * navbar"
echo "           * footer"
read x
mkdir src/scss
# mkdir src/app/globals

# ng generate module shell -m=app.module
# ng generate component shell/navbar -m=shell.module
# ng generate component shell/menu -m=shell.module
# ng generate component shell/footer -m=shell.module

# ng generate module pages/login -m=app.module
# ng generate component pages/login -m=app.module

# ng generate module pages/home -m=app.module
# ng generate component pages/home -m=app.module


# Default files:

###############################################################################################
##### Default app shell module #####
# echo "import { NgModule } from '@angular/core';
# import { CommonModule } from '@angular/common';
# import { NavbarComponent } from './navbar/navbar.component';
# import { MenuComponent } from './menu/menu.component';
# import { FooterComponent } from './footer/footer.component';
# import { RouterModule } from '@angular/router';
# @NgModule({
#   declarations: [NavbarComponent, MenuComponent, FooterComponent],
#   imports: [CommonModule, RouterModule],
#   exports: [NavbarComponent, MenuComponent, FooterComponent],
# })
# export class ShellModule { }" > src/app/shell/shell.module.ts


###############################################################################################
##### Default app shell html #####
# echo '<app-navbar></app-navbar>
# <app-menu></app-menu>
# <div class="container route-container">
#  <div class="row">
#    <div class="col-12">
#      <router-outlet></router-outlet>
#    </div>
#  </div>
# </div>
# <app-footer></app-footer>' > src/app/app.component.html

###############################################################################################
###### Default Navbar html #####
# echo '<nav class="navbar navbar-dark bg-dark mb-5">
#  <a class="navbar-brand" routerLink="/home">My Cool App</a>
#  <div class="navbar-expand mr-auto">
#    <div class="navbar-nav">
#      <a class="nav-item nav-link active" routerLink="/home">Home</a>
#      <a class="nav-item nav-link"        routerLink="/page1">Page1</a>
#      <a class="nav-item nav-link"        routerLink="/page1">Page2</a>
#      <a class="nav-item nav-link"        routerLink="/page1">Page3</a>
#    </div>
#  </div>
#  <div class="navbar-expand ml-auto navbar-nav">
#    <div class="navbar-nav">
#      <span>User: Joel</span>
#    </div>
#  </div>
# </nav>' > src/app/shell/navbar/navbar.component.html

###############################################################################################
###### Initialize the routing module ######
# echo "import { HomeComponent } from './pages/home/home.component';
# import { LoginComponent } from './pages/login/login.component';

# import { NgModule } from '@angular/core';
# import { Routes, RouterModule } from '@angular/router';

# const routes: Routes = [
#   { path: '', redirectTo: '/home', pathMatch: 'full' },
#   { path: 'home',         component: HomeComponent },
#   { path: 'login',        component: LoginComponent },
# ];

# @NgModule({
#   imports: [RouterModule.forRoot(routes)],
#   exports: [RouterModule]
# })
# export class AppRoutingModule { }" > src/app/app-routing.module.ts


###############################################################################################
##### Initialize variables.scss
# echo "\$primary_color    : #00B6F1;
# \$secondary_color  : #93C83E;
# \$tertiary_color   : #ED0677;
# \$quaternary_color : #004A64;
# \$warning_color    : #ED0677;
# \$extra_color      : #F17B3F;

# \$white: #FFF;
# \$menu-bg: #d4d4d4;

# /* Bootstrap theme overwritting */
# \$primary:       $primary_color;
# \$secondary:     $secondary_color;
# \$success:       $primary_color;
# \$info:          $quaternary_color;
# \$warning:       $extra_color;
# \$danger:        $warning_color;
# \$light:         $primary_color;
# \$dark:          $primary_color;

# \$navbar-dark-color:                 \$white;
# \$navbar-dark-hover-color:           rgba(\$white, .75);
# \$navbar-dark-active-color:          rgba(\$white, .80);
# \$navbar-dark-disabled-color:        rgba(\$white, .25);
# \$navbar-dark-brand-color:           \$white;
# \$navbar-dark-brand-hover-color:     \$white;" > src/scss/variables.scss


###############################################################################################
##### Initialize layout.scss
# echo '// Styles for the main layout (menu/navbar/view)

# $navbar-height: 70px;
# $menu-width: 56px;
# $bodyBgColor:#ebeff2;

# body {
#   background: $bodyBgColor;
# }

# nav.navbar-dark {
#   position: fixed;
#   z-index: 9999;
#   left: 0;
#   top: 0;
#   right: 0;
#   height: $navbar-height;
#   div.navbar-brand {
#     color: $white;
#     font-size: 26px;
#     font-weight: bold;
#   }
#   border-bottom: 1px solid $white;
# }

# .menu-bar {
#   position: fixed;
#   left: 0;
#   top: $navbar-height;
#   bottom: 0;
#   width: $menu-width;
#   background: $menu-bg;
#   ul {
#     list-style-type: none;
#     margin: 0;
#     padding: 0;
#     li.menu-entry {
#       text-align: center;
#       padding: 3px 0;
#       a.menu-entry-link {
#         display: block;
#         padding: 10px 0;
#         font-size: 25px;
#         color: #797979;
#         cursor: pointer;
#         &:hover {
#           background: lighten($menu-bg, 20%);
#           text-decoration: none;
#         }
#       }
#       &.active {
#         background: $white;
#         border-left: 5px solid $primary_color;
#         padding-left: 0;
#         a.menu-entry-link {
#           color: $primary_color;
#         }
#       }
#     }
#   }
# }

# .route-container {
#   padding-top: calc(#{$navbar-height} + 15px);
#   padding-right: 15px;
#   padding-left: calc(#{$menu-width} + 40px);
#   padding-bottom: 0;
#   max-width: none;
# }

# .page-heading-row {
#   border: none 0;
#   font-size: 20px;
#   margin: 0;
#   font-weight: 600;
#   color: $primary_color;
# }' > src/scss/layout.scss


###############################################################################################
##### Initialize menu (component)
# echo '<div class="menu-bar">
#   <ul>
#     <li *ngFor="let menuEntry of menuEntries" class="menu-entry" [class.active]="menuEntry.isActive">
#       <a class="menu-entry-link" [routerLink]="menuEntry.route">
#         <span [ngClass]="menuEntry.icon"></span>
#       </a>
#     </li>
#   </ul>
# </div>' > src/app/shell/menu/menu.component.html

# echo "import { Component, OnInit } from '@angular/core';
# import { ActivatedRoute, Router } from '@angular/router';
# import { Location } from '@angular/common';
# @Component({
#   selector: 'app-menu',
#   templateUrl: './menu.component.html',
#   styleUrls: ['./menu.component.scss']
# })
# export class MenuComponent implements OnInit {
#   public menuEntries = [
#     { id: 1, name: 'Home',        icon: 'icon-home',      isActive:false, route: 'home' },
#     { id: 2, name: 'Library',     icon: 'icon-list',      isActive:false, route: 'library' },
#     { id: 3, name: 'User',        icon: 'icon-user-plus', isActive:false, route: 'user' },
#   ];

#   constructor() { }
#   ngOnInit() {}
# }" > src/app/shell/menu/menu.component.ts





echo ""
echo ""
