import { Routes } from '@angular/router';
import { SidebarComponent } from './layout/sidebar/sidebar';
import { LayoutComponent } from './layout/layout';
import { Approvals } from './pages/approvals/approvals';


export const routes: Routes = [
  {
    path: '',
    component: LayoutComponent,
    children: [
      { path: '', component: Approvals, pathMatch: 'full' },
    ]
  },
  { path: '**', redirectTo: '' }
];
