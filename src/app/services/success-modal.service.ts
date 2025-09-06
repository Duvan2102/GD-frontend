import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

export interface SuccessModalData {
  title: string;
  message: string;
}

@Injectable({
  providedIn: 'root'
})
export class SuccessModalService {
  private successModalSubject = new BehaviorSubject<SuccessModalData | null>(null);
  public successModal$ = this.successModalSubject.asObservable();

  showSuccess(title: string, message: string) {
    this.successModalSubject.next({ title, message });
  }

  hideSuccess() {
    this.successModalSubject.next(null);
  }

  getCurrentModalData(): SuccessModalData | null {
    return this.successModalSubject.value;
  }
}
