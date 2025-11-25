import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { AuthService } from '../../services/auth.service';
import { TwoFAState, QRSetupData } from '../../interfaces/common.interfaces';
import * as QRCode from 'qrcode';

@Component({
  selector: 'app-two-fa-state',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './two-fa-state.component.html',
  styleUrls: ['./two-fa-state.component.css']
})
export class TwoFAStateComponent implements OnInit, OnDestroy {
  currentUser: string = '';
  twoFAState: TwoFAState | null = null;
  qrData: QRSetupData | null = null;
  qrCodeDataUrl: string = '';
  isLoading: boolean = true;
  errorMessage: string = '';
  private destroy$ = new Subject<void>();

  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  ngOnInit(): void {
    if (!this.authService.isTwoFARequired()) {
      this.router.navigate(['/login']);
      return;
    }

    this.router.navigate(['/two-fa-verification']);

  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  check2FAStatus(): void {
    this.isLoading = true;
    this.errorMessage = '';

    this.authService.check2FAStatus().subscribe({
      next: (response) => {
        this.isLoading = false;

        this.determineNextAction();
      },
      error: (error) => {
        console.error('Error verificando estado 2FA:', error);
        this.handleError(error);
        this.isLoading = false;
      }
    });
  }

  private determineNextAction(): void {
    if (!this.twoFAState) {
      this.errorMessage = 'No se pudo determinar el estado de 2FA';
      return;
    }

    if (this.twoFAState.googleAuthPending) {
      this.router.navigate(['/two-fa-verification']);
    } else if (this.twoFAState.hasGoogleAuth) {
      this.router.navigate(['/two-fa-verification']);
    } else if (this.twoFAState.hasEmailBackup && !this.twoFAState.hasGoogleAuth) {
      this.router.navigate(['/two-fa-verification']);
    } else if (!this.twoFAState.hasGoogleAuth && !this.twoFAState.hasEmailBackup && !this.twoFAState.googleAuthPending) {
      console.log('Usuario sin 2FA configurado, redirigiendo a verificación...');
      this.router.navigate(['/two-fa-verification']);
    } else {
      console.error('Estado 2FA no reconocido:', this.twoFAState);
      this.errorMessage = `Estado de configuración 2FA no reconocido. Por favor, contacta al administrador.`;
    }
  }

  loadQRCode(): void {
    this.isLoading = true;
    this.errorMessage = '';

    this.authService.getQRCode().subscribe({
      next: (qrData) => {
        this.qrData = qrData;
        this.generateQRCode(qrData.qrCodeUrl);
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error cargando código QR:', error);
        this.handleError(error);
        this.isLoading = false;
      }
    });
  }

  private generateQRCode(otpauthUrl: string): void {
    QRCode.toDataURL(otpauthUrl, {
      width: 256,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#FFFFFF'
      }
    }).then((dataUrl: string) => {
      this.qrCodeDataUrl = dataUrl;
    }).catch((error: any) => {
      console.error('Error generando código QR:', error);
      this.errorMessage = 'Error generando código QR';
    });
  }

  onSetupGoogleAuth(): void {
    this.router.navigate(['/google-auth-setup']);
  }

  onUseEmailBackup(): void {
    this.router.navigate(['/two-fa-verification']);
  }

  onBackToLogin(): void {
    this.authService.clear2FAState();
    this.router.navigate(['/login']);
  }

  private handleError(error: any): void {
    if (error.error?.code) {
      switch (error.error.code) {
        case 'TOKEN_INVALIDO':
          this.errorMessage = 'Sesión expirada. Por favor, inicia sesión nuevamente';
          setTimeout(() => {
            this.onBackToLogin();
          }, 2000);
          break;
        case 'USUARIO_BLOQUEADO':
          this.errorMessage = 'Usuario bloqueado. Intenta más tarde';
          break;
        default:
          const errorMsg = error.error.message || '';
          if (errorMsg.toLowerCase().includes('user is disabled')) {
            this.errorMessage = 'Usuario deshabilitado. Contacta al administrador.';
          } else {
            this.errorMessage = errorMsg || 'Error desconocido';
          }
      }
    } else if (error.error?.message) {
      const errorMsg = error.error.message;
      if (errorMsg.toLowerCase().includes('user is disabled')) {
        this.errorMessage = 'Usuario deshabilitado. Contacta al administrador.';
      } else {
        this.errorMessage = errorMsg;
      }
    } else {
      this.errorMessage = 'Error de conexión. Verifica tu conexión a internet';
    }
  }

  get hasGoogleAuth(): boolean {
    return this.twoFAState?.hasGoogleAuth || false;
  }

  get hasEmailBackup(): boolean {
    return this.twoFAState?.hasEmailBackup || false;
  }

  get googleAuthPending(): boolean {
    return this.twoFAState?.googleAuthPending || false;
  }

  get needsSetup(): boolean {
    return this.twoFAState ? this.twoFAState.googleAuthPending || (!this.twoFAState.hasGoogleAuth && !this.twoFAState.hasEmailBackup) : false;
  }

  get isConfigured(): boolean {
    return this.twoFAState?.isConfigured || false;
  }
}
