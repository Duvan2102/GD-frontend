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

    // Suscribirse al usuario que requiere 2FA
    this.authService.getTwoFAUser()
      .pipe(takeUntil(this.destroy$))
      .subscribe(user => {
        this.currentUser = user;
      });

    // Suscribirse al estado de 2FA
    this.authService.getTwoFAState()
      .pipe(takeUntil(this.destroy$))
      .subscribe(state => {
        this.twoFAState = state;
      });

    // Verificar estado de 2FA
    this.check2FAStatus();
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

        // Determinar qué acción tomar basado en el estado
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

    // Nuevo flujo basado en la documentación actualizada
    if (this.twoFAState.googleAuthPending) {
      // Google Auth está pendiente de configuración
      this.router.navigate(['/two-fa-verification']);
    } else if (this.twoFAState.hasGoogleAuth) {
      // Usuario tiene Google Auth configurado y confirmado
      this.router.navigate(['/two-fa-verification']);
    } else if (this.twoFAState.hasEmailBackup && !this.twoFAState.hasGoogleAuth) {
      // Usuario tiene solo email configurado
      this.router.navigate(['/two-fa-verification']);
    } else if (!this.twoFAState.hasGoogleAuth && !this.twoFAState.hasEmailBackup && !this.twoFAState.googleAuthPending) {
      // Usuario no tiene ningún método 2FA configurado - redirigir a verificación para configurar
      console.log('Usuario sin 2FA configurado, redirigiendo a verificación...');
      this.router.navigate(['/two-fa-verification']);
    } else {
      // Estado inesperado - mostrar error con más detalles
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
          this.errorMessage = error.error.message || 'Error desconocido';
      }
    } else {
      this.errorMessage = 'Error de conexión. Verifica tu conexión a internet';
    }
  }

  // Getters para el template (actualizados)
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
