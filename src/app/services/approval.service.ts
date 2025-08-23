import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { map } from 'rxjs/operators';
import { Approval } from '../pages/approvals/approvals';

@Injectable({
  providedIn: 'root'
})
export class ApprovalService {
  private approvalsSubject = new BehaviorSubject<Approval[]>([]);
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

  getApprovalsByCreator(userId: number): Observable<Approval[]> {
    return this.approvals$.pipe(
      map(approvals => approvals.filter(a => a.fullData?.creador?.noUsuario === userId))
    );
  }

  getApprovalsByApprover(userUsuario: string): Observable<Approval[]> {
    return this.approvals$.pipe(
      map(approvals => approvals.filter(a => 
        a.fullData?.destinatarios.some(d => d.usuarioId === userUsuario)
      ))
    );
  }

  getApprovalDetails(approvalId: string | number): Observable<Approval | undefined> {
    const approval = this.approvalsSubject.getValue().find(a => a.id.toString() === approvalId.toString());
    return of(approval);
  }

  getAllApprovals(): Observable<Approval[]> {
    return this.approvals$;
  }
}