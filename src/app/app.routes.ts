import { Routes } from '@angular/router';
import { authGuard, redirectIfAuthenticatedGuard } from './core/auth/auth.guard';
import { permissionGuard } from './core/auth/permission.guard';
import { AppLayoutComponent } from './core/layout/app-layout.component';

export const routes: Routes = [
  {
    path: '',
    component: AppLayoutComponent,
    canActivate: [authGuard],
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      {
        path: 'dashboard',
        loadComponent: () =>
          import('./features/dashboard/dashboard.component').then(m => m.DashboardComponent),
        data: { title: 'Dashboard' },
      },
      {
        path: 'identity/pessoas',
        canActivate: [permissionGuard('Identity.Users.View')],
        loadComponent: () =>
          import('./features/identity/people/people-list.component').then(
            m => m.PeopleListComponent,
          ),
        data: { title: 'Pessoas' },
      },
      {
        path: 'identity/perfis',
        canActivate: [permissionGuard('Identity.Roles.View')],
        loadComponent: () =>
          import('./features/identity/roles/roles-list.component').then(
            m => m.RolesListComponent,
          ),
        data: { title: 'Perfis' },
      },
      {
        path: 'research/posicoes',
        canActivate: [permissionGuard('Research.Positions.View')],
        loadComponent: () =>
          import('./features/research/positions/positions-list.component').then(
            m => m.PositionsListComponent,
          ),
        data: { title: 'Posições no Laboratório' },
      },
      {
        path: 'research/parceiros',
        canActivate: [permissionGuard('Research.Partners.View')],
        loadComponent: () =>
          import('./features/research/partners/partners-list.component').then(
            m => m.PartnersListComponent,
          ),
        data: { title: 'Parceiros' },
      },
    ],
  },
  {
    path: 'login',
    canActivate: [redirectIfAuthenticatedGuard],
    loadComponent: () =>
      import('./features/auth/login/login.component').then(m => m.LoginComponent),
  },
  {
    path: 'forgot-password',
    canActivate: [redirectIfAuthenticatedGuard],
    loadComponent: () =>
      import('./features/auth/forgot-password/forgot-password.component').then(
        m => m.ForgotPasswordComponent,
      ),
  },
  {
    path: 'reset-password',
    canActivate: [redirectIfAuthenticatedGuard],
    loadComponent: () =>
      import('./features/auth/reset-password/reset-password.component').then(
        m => m.ResetPasswordComponent,
      ),
  },
  {
    path: 'unauthorized',
    loadComponent: () =>
      import('./features/auth/unauthorized/unauthorized.component').then(
        m => m.UnauthorizedComponent,
      ),
  },
];
