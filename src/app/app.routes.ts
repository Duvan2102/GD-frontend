import { Routes } from '@angular/router';
import { Layout } from './layout/layout';
import { Approvals } from './pages/approvals/approvals';
import { Administration } from './pages/administration/administration';
import { ReportsAudits } from './pages/reports-audits/reports-audits';
import { Users } from './pages/users/users';
import { CreateRequest } from './pages/create-request/create-request';
import { ApprovalDetails } from './pages/approval-details/approval-details';
import { LoginComponent } from './pages/login/login.component';
import { TwoFAVerificationComponent } from './components/two-fa-verification/two-fa-verification.component';
import { GoogleAuthSetupComponent } from './components/google-auth-setup/google-auth-setup.component';
import { TwoFAManagementComponent } from './components/two-fa-management/two-fa-management.component';
import { TwoFAStateComponent } from './components/two-fa-state/two-fa-state.component';
import { AuthGuard } from './guards/auth.guard';
import { LoginGuard } from './guards/login.guard';

export const routes: Routes = [
  {
    path: 'login',
    component: LoginComponent,
    canActivate: [LoginGuard]
  },
  {
    path: 'two-fa-state',
    component: TwoFAStateComponent
  },
  {
    path: 'two-fa-verification',
    component: TwoFAVerificationComponent
  },
  {
    path: 'google-auth-setup',
    component: GoogleAuthSetupComponent,
    canActivate: [AuthGuard]
  },
  {
    path: 'two-fa-management',
    component: TwoFAManagementComponent,
    canActivate: [AuthGuard]
  },
  {
    path: '',
    component: Layout,
    canActivate: [AuthGuard],
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
  { path: '**', redirectTo: 'login' }
];
