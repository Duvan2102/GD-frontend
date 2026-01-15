import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

export type AlertType = 'success' | 'error' | 'warning' | 'info';

export interface SuccessModalData {
  title: string;
  message: string;
  type?: AlertType;
}

@Injectable({
  providedIn: 'root'
})
export class SuccessModalService {
  private successModalSubject = new BehaviorSubject<SuccessModalData | null>(null);
  public successModal$ = this.successModalSubject.asObservable();

  showSuccess(title: string, message: string, type: AlertType = 'success') {
    const alertType = title.toLowerCase().includes('error') ? 'error' : type;
    this.successModalSubject.next({ title, message, type: alertType });
  }

  hideSuccess() {
    this.successModalSubject.next(null);
  }

  getCurrentModalData(): SuccessModalData | null {
    return this.successModalSubject.value;
  }
}
