import { Component, OnInit, OnDestroy } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { Layout} from './layout/layout';
import { Approvals } from "./pages/approvals/approvals";
import { SuccessModalComponent } from './components/success-modal/success-modal.component';
import { SuccessModalService, SuccessModalData } from './services/success-modal.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [ RouterOutlet, SuccessModalComponent],
  templateUrl: './app.html',
  styleUrls: ['./app.css']
})
export class App implements OnInit, OnDestroy {
  protected title = 'gd-frontend';

  // Success modal properties
  isSuccessModalVisible = false;
  successModalTitle = 'Proceso completado con éxito';
  successModalMessage = 'La operación se ha realizado correctamente.';
  private successModalSubscription?: Subscription;

  constructor(private successModalService: SuccessModalService) {}

  ngOnInit() {
    this.successModalSubscription = this.successModalService.successModal$.subscribe(
      (data: SuccessModalData | null) => {
        if (data) {
          this.successModalTitle = data.title;
          this.successModalMessage = data.message;
          this.isSuccessModalVisible = true;
        } else {
          this.isSuccessModalVisible = false;
        }
      }
    );
  }

  ngOnDestroy() {
    if (this.successModalSubscription) {
      this.successModalSubscription.unsubscribe();
    }
  }

  closeSuccessModal() {
    this.successModalService.hideSuccess();
  }
}
