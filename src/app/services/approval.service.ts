import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { Approval } from '../pages/approvals/approvals';

@Injectable({
  providedIn: 'root'
})
export class ApprovalService {
  private approvalsList: Approval[] = [];
  private approvalsSubject = new BehaviorSubject<Approval[]>(this.approvalsList);
  approvals$: Observable<Approval[]> = this.approvalsSubject.asObservable();

  constructor() { }

  addApproval(approval: Approval) {
    const currentApprovals = this.approvalsSubject.getValue();
    this.approvalsSubject.next([approval, ...currentApprovals]);
  }

  updateApproval(updatedApproval: Approval) {
    const currentApprovals = this.approvalsSubject.getValue();
    const index = currentApprovals.findIndex(a => a.id === updatedApproval.id);
    if (index > -1) {
      currentApprovals[index] = updatedApproval;
      this.approvalsSubject.next([...currentApprovals]);
    }
  }

  deleteApproval(approvalId: string | number) {
    const currentApprovals = this.approvalsSubject.getValue();
    const filteredApprovals = currentApprovals.filter(a => a.id.toString() !== approvalId.toString());
    this.approvalsSubject.next(filteredApprovals);
  }
}