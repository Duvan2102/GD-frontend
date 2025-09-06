import { Routes } from '@angular/router';
import { Layout } from './layout/layout';
import { Approvals } from './pages/approvals/approvals';
import { Administration } from './pages/administration/administration';
import { ReportsAudits } from './pages/reports-audits/reports-audits';
import { Users } from './pages/users/users';
import { CreateRequest } from './pages/create-request/create-request';
import { ApprovalDetails } from './pages/approval-details/approval-details';
import { AuthGuard } from './guards/auth.guard';

export const routes: Routes = [
  {
    path: '',
    component: Layout,
    children: [
      { path: '', redirectTo: 'create-request', pathMatch: 'full' },
      { path: 'create-request', component: CreateRequest },
      { path: 'approvals', component: Approvals },
      { path: 'approval-details', component: ApprovalDetails },
      {
        path: 'users',
        component: Users,
        canActivate: [AuthGuard],
        data: { permission: 'canAccessUsers' } 
      },
      {
        path: 'administration',
        component: Administration,
        canActivate: [AuthGuard],
        data: { permission: 'canAccessAdmin' } 
      },
      {
        path: 'reports-audits',
        component: ReportsAudits,
        canActivate: [AuthGuard],
        data: { permission: 'canAccessReports' } 
      },
    ],
  },
  { path: '**', redirectTo: '' }
];