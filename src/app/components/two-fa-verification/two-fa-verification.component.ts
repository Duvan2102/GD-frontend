import { Component, OnInit, OnDestroy } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { Subject, takeUntil } from 'rxjs';
import { AuthService } from '../../services/auth.service';
import { TwoFAState } from '../../interfaces/common.interfaces';
import * as QRCode from 'qrcode';

@Component({
  selector: 'app-two-fa-verification',
  standalone: true,
  imports: [ReactiveFormsModule, CommonModule],
  templateUrl: './two-fa-verification.component.html',
  styleUrls: ['./two-fa-verification.component.css']
})
export class TwoFAVerificationComponent implements OnInit, OnDestroy {
  verificationForm: FormGroup;
  errorMessage: string = '';
  isLoading: boolean = false;
  currentUser: string = '';
  twoFAState: TwoFAState | null = null;
  qrCodeDataUrl: string = '';
  showQRCode: boolean = false;
  qrScanned: boolean = false;
  qrSecret: string = '';
  
  // Propiedades para envío automático de correo
  emailSent: boolean = false;
  canResendEmail: boolean = false;
  resendCountdown: number = 0;
  private resendTimer: any = null;
  
  // Propiedades para timer de 90 segundos
  timeRemaining: number = 90;
  private timerInterval?: number;
  private readonly TIMER_DURATION = 90;
  
  private destroy$ = new Subject<void>();

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router
  ) {
    this.verificationForm = this.fb.group({
      codigo: ['', [Validators.required, Validators.minLength(6), Validators.maxLength(6)]]
    });
  }

  ngOnInit(): void {
    if (!this.authService.isTwoFARequired()) {
      this.router.navigate(['/login']);
      return;
    }

    // Iniciar timer de 90 segundos
    this.startTimer();

    // Suscribirse al usuario que requiere 2FA
    this.authService.getTwoFAUser()
      .pipe(takeUntil(this.destroy$))
      .subscribe(user => {
        this.currentUser = user;
      });

    // Suscribirse al estado de 2FA para mostrar opciones apropiadas
    this.authService.getTwoFAState()
      .pipe(takeUntil(this.destroy$))
      .subscribe(state => {
        if (state) {
          this.twoFAState = state;

          // Si Google Auth está pendiente, intentar validar para obtener QR
          if (state.googleAuthPending) {
            this.attemptValidationForQR();
          }
          
          // Si el método es EMAIL, enviar correo automáticamente
          if (state.metodoActual === 'EMAIL' && !this.emailSent) {
            this.sendEmailAutomatically();
          }
        }
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    
    // Limpiar temporizadores
    this.clearTimer();
    if (this.resendTimer) {
      clearInterval(this.resendTimer);
    }
  }

  onSubmit(): void {
    if (this.verificationForm.valid) {
      this.isLoading = true;
      this.errorMessage = '';

      const { codigo } = this.verificationForm.value;

      // Si ya se escaneó el QR, confirmar Google Auth
      if (this.qrScanned && this.qrSecret) {
        this.confirmGoogleAuthWithCode(codigo);
        return;
      }

      // Validación normal de código 2FA
      this.authService.validate2FACode(codigo).subscribe({
        next: (response) => {
          if (response.success) {
            this.router.navigate(['/']);
          } else if (response.qrCodeUrl && response.secret) {
            this.showQRCode = true;
            this.qrScanned = false;
            this.qrSecret = response.secret;
            this.generateQRCode(response.qrCodeUrl);
            this.errorMessage = response.message || 'Configura Google Authenticator escaneando el código QR';
          } else {
            this.errorMessage = response.message || 'Error validando código';
          }
          this.isLoading = false;
        },
        error: (error) => {
          console.error('Error validando código 2FA:', error);
          this.handleError(error);
          this.isLoading = false;
        }
      });
    } else {
      this.markFormGroupTouched();
    }
  }

  // Enviar correo automáticamente cuando el método es EMAIL
  private sendEmailAutomatically(): void {
    this.isLoading = true;
    this.errorMessage = '';

    this.authService.sendEmailCode().subscribe({
      next: (response) => {
        this.emailSent = true;
        this.errorMessage = '';
        this.startResendTimer();
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error enviando código por email automáticamente:', error);
        this.isLoading = false;
        
        // Mostrar mensaje de error específico
        if (error.status === 400) {
          this.errorMessage = 'No se pudo enviar el código por email. Por favor, verifica que tu correo empresarial esté configurado correctamente o contacta al administrador.';
        } else {
          this.handleError(error);
        }
      }
    });
  }

  onSendEmailCode(): void {
    this.isLoading = true;
    this.errorMessage = '';

    this.authService.sendEmailCode().subscribe({
      next: (response) => {
        this.emailSent = true;
        this.errorMessage = '';
        this.startResendTimer();
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error enviando código por email:', error);
        this.handleError(error);
        this.isLoading = false;
      }
    });
  }

  // Iniciar temporizador para reenvío
  private startResendTimer(): void {
    this.canResendEmail = false;
    this.resendCountdown = 15;
    
    this.resendTimer = setInterval(() => {
      this.resendCountdown--;
      
      if (this.resendCountdown <= 0) {
        this.canResendEmail = true;
        clearInterval(this.resendTimer);
        this.resendTimer = null;
      }
    }, 1000);
  }

  onSetupGoogleAuth(): void {
    this.router.navigate(['/google-auth-setup']);
  }

  onBackToLogin(): void {
    this.authService.clear2FAState();
    this.router.navigate(['/login']);
  }

  // Nuevo método para cuando el usuario ya escaneó el QR
  onQRScanned(): void {
    this.isLoading = true;
    this.errorMessage = '';

    // Ocultar el QR y mostrar el formulario de código
    this.showQRCode = false;
    this.qrScanned = true;

    // Limpiar el formulario para que el usuario ingrese el código
    this.verificationForm.patchValue({ codigo: '' });

    this.isLoading = false;
  }

  // Nuevo método para intentar validación y obtener QR automáticamente
  private attemptValidationForQR(): void {
    this.authService.validate2FACode('').subscribe({
      next: (response) => {
        if (response.qrCodeUrl && response.secret) {
          this.showQRCode = true;
          this.qrSecret = response.secret;
          this.generateQRCode(response.qrCodeUrl);
          this.errorMessage = response.message || 'Configura Google Authenticator escaneando el código QR';
        }
      },
      error: (error) => {
      }
    });
  }

  // Generar código QR
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

  // Confirmar configuración de Google Auth con código
  private confirmGoogleAuthWithCode(codigo: string): void {
    if (!this.qrSecret) {
      this.errorMessage = 'Error: Secret no encontrado';
      this.isLoading = false;
      return;
    }

    this.authService.confirmGoogleAuthenticator(codigo, this.qrSecret).subscribe({
      next: (response) => {
        this.validate2FACodeAfterGoogleAuthSetup(codigo);
      },
      error: (error) => {
        console.error('Error confirmando Google Auth:', error);
        this.handleError(error);
        this.isLoading = false;
      }
    });
  }

  // Validar código 2FA después de configurar Google Auth
  private validate2FACodeAfterGoogleAuthSetup(codigo: string): void {
    this.authService.validate2FACode(codigo).subscribe({
      next: (response) => {
        if (response.success) {
          this.router.navigate(['/']);
        } else {
          this.errorMessage = response.message || 'Código de verificación incorrecto. Intenta nuevamente.';
          this.isLoading = false;
        }
      },
      error: (error) => {
        console.error('Error validando código después de configurar Google Auth:', error);
        this.handleError(error);
        this.isLoading = false;
      }
    });
  }

  private markFormGroupTouched(): void {
    Object.keys(this.verificationForm.controls).forEach(key => {
      const control = this.verificationForm.get(key);
      control?.markAsTouched();
    });
  }

  private handleError(error: any): void {
    if (error.error?.code) {
      switch (error.error.code) {
        case 'CODIGO_2FA_INVALIDO':
          this.errorMessage = 'Código de verificación incorrecto';
          break;
        case 'TOKEN_INVALIDO':
          this.errorMessage = 'Sesión expirada. Por favor, inicia sesión nuevamente';
          this.onBackToLogin();
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

  getFieldError(fieldName: string): string {
    const field = this.verificationForm.get(fieldName);
    if (field?.errors && field.touched) {
      if (field.errors['required']) {
        return 'Código de verificación es requerido';
      }
      if (field.errors['minlength'] || field.errors['maxlength']) {
        return 'El código debe tener exactamente 6 dígitos';
      }
    }
    return '';
  }

  // Auto-avanzar al siguiente campo cuando se completa un dígito
  onKeyUp(event: any): void {
    const input = event.target;
    const value = input.value;

    if (value.length === 6) {
      if (this.verificationForm.valid) {
        this.onSubmit();
      }
    }
  }

  // Permitir solo números
  onKeyPress(event: any): boolean {
    const charCode = event.which ? event.which : event.keyCode;
    if (charCode > 31 && (charCode < 48 || charCode > 57)) {
      return false;
    }
    return true;
  }

  // Getters para el template
  get hasGoogleAuth(): boolean {
    return this.twoFAState?.hasGoogleAuth || false;
  }

  get hasEmailBackup(): boolean {
    return this.twoFAState?.hasEmailBackup || false;
  }

  get googleAuthPending(): boolean {
    return this.twoFAState?.googleAuthPending || false;
  }

  get shouldShowEmailOption(): boolean {
    return this.twoFAState?.metodoActual === 'EMAIL' || 
           (!this.hasGoogleAuth && this.hasEmailBackup && !this.googleAuthPending);
  }

  get shouldShowGoogleAuthOption(): boolean {
    return this.twoFAState?.metodoActual === 'GOOGLE_AUTH' || 
           (this.hasGoogleAuth && !this.googleAuthPending);
  }

  // Getter para determinar el tipo de 2FA activo
  get current2FAMethod(): 'GOOGLE_AUTH' | 'EMAIL' | 'QR_SETUP' | 'UNKNOWN' {
    if (this.showQRCode && this.qrCodeDataUrl) {
      return 'QR_SETUP';
    }
    
    // Si ya escaneó el QR, debe ser Google Auth
    if (this.qrScanned && this.qrSecret) {
      return 'GOOGLE_AUTH';
    }
    
    // Si Google Auth está pendiente pero no hay QR visible, es configuración
    if (this.googleAuthPending && !this.showQRCode) {
      return 'QR_SETUP';
    }
    
    // Usar el método actual del servidor si está disponible
    if (this.twoFAState?.metodoActual) {
      return this.twoFAState.metodoActual;
    }
    
    // Fallback basado en configuración disponible
    if (this.hasGoogleAuth && !this.googleAuthPending) {
      return 'GOOGLE_AUTH';
    }
    
    if (this.hasEmailBackup && !this.googleAuthPending) {
      return 'EMAIL';
    }
    
    return 'UNKNOWN';
  }

  // Métodos para manejar el timer de 90 segundos
  private startTimer(): void {
    this.clearTimer();
    this.timeRemaining = this.TIMER_DURATION;
    this.timerInterval = window.setInterval(() => {
      this.timeRemaining--;
      if (this.timeRemaining <= 0) {
        this.clearTimer();
        this.onTimerExpired();
      }
    }, 1000);
  }

  private clearTimer(): void {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = undefined;
    }
  }

  private onTimerExpired(): void {
    this.authService.clear2FAState();
    this.router.navigate(['/login']);
  }
}
