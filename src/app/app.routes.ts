import { Routes } from '@angular/router';
import { Sidebar } from './layout/sidebar/sidebar';
import { Layout } from './layout/layout';

export const routes: Routes = [
  {
    path: '',
    component: Layout,
    children: [
      { path: '', redirectTo: 'aprobaciones', pathMatch: 'full' },
    ]
  },
  // opcional: una ruta “catch-all” para redirectTo o página 404
  { path: '**', redirectTo: '' }
];
