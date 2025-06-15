import { Routes } from '@angular/router';
import { SidebarComponent } from './layout/sidebar/sidebar.component';
import { LayoutComponent } from './layout/layout..component';
import { Aprobaciones } from './pages/approvals/aprobaciones/aprobaciones';


export const routes: Routes = [
  {
    path: '',
    component: LayoutComponent,
    children: [
      { path: '', redirectTo: 'aprobaciones', pathMatch: 'full' },
      { path: 'aprobaciones', component: Aprobaciones }
    ]
  },
  // opcional: una ruta “catch-all” para redirectTo o página 404
  { path: '**', redirectTo: '' }
];
