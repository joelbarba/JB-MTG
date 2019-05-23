echo "Init an Angular 7 Project with the following:"
echo "  1. Bootstrap 4"
echo "  2. IcoMoon"
echo "  3. Bf-UI-lib"
echo "  4. Basic app folder structure"
echo ""
echo "------------------------------------------------"
# echo "  1. Install Bootstrap 4 and inject it in styles.scss"
# read x
# npm install bootstrap@4  --save
# echo '@import "~bootstrap/dist/css/bootstrap.css";' > src/styles.scss


# echo ""
# echo "----------------------------------------------------------"
# echo "  2. Import icomoon from npm (https://www.npmjs.com/package/bf-icomoon)"
# read x
# npm install bf-icomoon --save
# echo '@import "~bf-icomoon/css/icomoon.css";' >> src/styles.scss


# echo ""
# echo "----------------------------------------------------------"
# echo "  3. Bf-UI-lib"
# read x
# npm install bf-ui-lib

echo ""
echo "----------------------------------------------------------"
echo "  4. Basic app folder structure:"
echo "     - app"
echo "       - globals"
echo "       - pages"
echo "         * login"
echo "         * home"
echo "       - shell"
echo "         * menu"
echo "         * navbar"
echo "         * footer"
read x
# mkdir src/app/globals

# ng generate module shell -m=app.module
# ng generate component shell/navbar -m=shell.module
# ng generate component shell/menu -m=shell.module
# ng generate component shell/footer -m=shell.module

# ng generate module pages/login -m=app.module
# ng generate component pages/login -m=app.module

# ng generate module pages/home -m=app.module
# ng generate component pages/home -m=app.module


##### Default app shell html #####
echo '<app-navbar></app-navbar>
<app-menu></app-menu>
<div class="container route-container">
 <div class="row">
   <div class="col-12">
     <router-outlet></router-outlet>
   </div>
 </div>
</div>
<app-footer></app-footer>' > src/app/app.component.html


###### Default Navbar html #####
echo '<nav class="navbar navbar-dark bg-dark mb-5">
 <a class="navbar-brand" routerLink="/home">My Cool App</a>
 <div class="navbar-expand mr-auto">
   <div class="navbar-nav">
     <a class="nav-item nav-link active" routerLink="/home">Home</a>
     <a class="nav-item nav-link"        routerLink="/page1">Page1</a>
     <a class="nav-item nav-link"        routerLink="/page1">Page2</a>
     <a class="nav-item nav-link"        routerLink="/page1">Page3</a>
   </div>
 </div>
 <div class="navbar-expand ml-auto navbar-nav">
   <div class="navbar-nav">
     <span>User: Joel</span>
   </div>
 </div>
</nav>' > src/app/shell/navbar/navbar.component.html


###### Initialize the routing module ######
echo "import { HomeComponent } from './pages/home/home.component';
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
];" > src/app/app-routing.module.ts

echo ""
echo ""
echo ""
