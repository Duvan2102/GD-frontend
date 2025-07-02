import { Routes } from '@angular/router';
import { Sidebar } from './layout/sidebar/sidebar';
import { Layout} from './layout/layout';
import { Approvals } from './pages/approvals/approvals';


export const routes: Routes = [
  {
    path: '',
    component: Layout,
    children: [
      { path: '', component: Approvals, pathMatch: 'full' },
    ]
  },
  { path: '**', redirectTo: '' }
];
