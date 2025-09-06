import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

export interface SuccessModalAcceptedEvent {
  source: 'create-request' | 'approvals' | 'approval-details';
  action: 'request-created' | 'request-cancelled' | 'request-approved' | 'request-rejected';
}

@Injectable({
  providedIn: 'root'
})
export class EventCommunicationService {
  private successModalAcceptedSubject = new BehaviorSubject<SuccessModalAcceptedEvent | null>(null);
  public successModalAccepted$ = this.successModalAcceptedSubject.asObservable();

  notifySuccessModalAccepted(event: SuccessModalAcceptedEvent) {
    this.successModalAcceptedSubject.next(event);
  }

  clearSuccessModalAccepted() {
    this.successModalAcceptedSubject.next(null);
  }
}
