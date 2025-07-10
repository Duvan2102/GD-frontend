import { Component } from '@angular/core';
import { Routes } from '@angular/router';
import { Layout } from './layout/layout';
import { Approvals } from './pages/approvals/approvals';
import { Administration } from './pages/administration/administration';
import { ReportsAudits } from './pages/reports-audits/reports-audits';
import { Users } from './pages/users/users';
import { CreateRequest } from './pages/create-request/create-request';
import { ApprovalDetails } from './pages/approval-details/approval-details';


export const routes: Routes = [
  {
    path: '',
    component: Layout,
    children: [
      { path: 'approvals', component: Approvals },
      { path: 'administration', component: Administration },
      { path: 'reports-audits', component: ReportsAudits },
      { path: 'users', component: Users },
      { path: 'create-request', component: CreateRequest },
      { path: 'approval-details', component: ApprovalDetails },
    ],
  },
  { path: '**', redirectTo: '' }
];
