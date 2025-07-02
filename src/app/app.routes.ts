import { Routes } from '@angular/router';
import { Sidebar } from './layout/sidebar/sidebar';
import { Layout } from './layout/layout';
import { Approvals } from './pages/approvals/approvals';
import { Administration } from './pages/administration/administration';

export const routes: Routes = [
  {
    path: '',
    component: Layout,
    children: [
      { path: '', redirectTo: 'aprobaciones', pathMatch: 'full' },
      { path: 'aprobaciones', component: Approvals },
      { path: 'administration', component: Administration },
    ],
  },
  { path: '**', redirectTo: '' },
];
