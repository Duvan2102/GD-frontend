import { Component, OnInit, OnDestroy } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { Subject, takeUntil } from 'rxjs';
import { AuthService } from '../../services/auth.service';
import { GoogleAuthSetupResponse } from '../../interfaces/common.interfaces';
import * as QRCode from 'qrcode';

@Component({
  selector: 'app-google-auth-setup',
  standalone: true,
  imports: [ReactiveFormsModule, CommonModule],
  templateUrl: './google-auth-setup.component.html',
  styleUrls: ['./google-auth-setup.component.css']
})
export class GoogleAuthSetupComponent implements OnInit, OnDestroy {
  setupForm: FormGroup;
  errorMessage: string = '';
  successMessage: string = '';
  isLoading: boolean = false;
  setupData: GoogleAuthSetupResponse | null = null;
  showQRCode: boolean = false;
  qrCodeDataUrl: string = '';
  private destroy$ = new Subject<void>();

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router
  ) {
    this.setupForm = this.fb.group({
      codigo: ['', [Validators.required, Validators.minLength(6), Validators.maxLength(6)]]
    });
  }

  ngOnInit(): void {
    this.loadSetupData();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadSetupData(): void {
    this.isLoading = true;
    this.errorMessage = '';

    this.authService.check2FAStatus().subscribe({
      next: (statusResponse) => {
        if (statusResponse.hasGoogleAuth && !statusResponse.googleAuthPending) {
          this.loadExistingQR();
        } else {
          this.setupNewGoogleAuth();
        }
      },
      error: (error) => {
        this.handleError(error);
        this.isLoading = false;
      }
    });
  }

  private loadExistingQR(): void {
    this.authService.getQRCode().subscribe({
      next: (qrData) => {
        this.setupData = {
          qrCodeUrl: qrData.qrCodeUrl,
          secret: qrData.secret,
          message: qrData.message
        };
        this.showQRCode = true;
        this.isLoading = false;
      },
      error: (error) => {
        this.handleError(error);
        this.isLoading = false;
      }
    });
  }

  private setupNewGoogleAuth(): void {
    this.authService.setupGoogleAuthenticator().subscribe({
      next: (response) => {
        this.setupData = response;
        this.showQRCode = true;
        this.generateQRCode(response.qrCodeUrl);
        this.isLoading = false;
      },
      error: (error) => {
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
    }).catch(() => {
      this.errorMessage = 'Error generando código QR';
    });
  }

  onSubmit(): void {
    if (this.setupForm.valid) {
      this.isLoading = true;
      this.errorMessage = '';
      this.successMessage = '';

      const { codigo } = this.setupForm.value;

      this.authService.confirmGoogleAuthenticator(codigo, this.setupData?.secret || '').subscribe({
        next: (response) => {
          this.successMessage = response.message;
          this.isLoading = false;
          setTimeout(() => {
            this.router.navigate(['/']);
          }, 2000);
        },
        error: (error) => {
          this.handleError(error);
          this.isLoading = false;
        }
      });
    } else {
      this.markFormGroupTouched();
    }
  }

  onSkip(): void {
    this.router.navigate(['/']);
  }

  onRegenerateQR(): void {
    this.isLoading = true;
    this.errorMessage = '';
    this.successMessage = '';

    this.authService.setupGoogleAuthenticator().subscribe({
      next: (response) => {
        this.setupData = {
          qrCodeUrl: response.qrCodeUrl,
          secret: response.secret,
          message: response.message
        };
        this.generateQRCode(response.qrCodeUrl);
        this.isLoading = false;
        this.successMessage = 'Nuevo código QR generado exitosamente. El código anterior ha sido invalidado.';
        setTimeout(() => {
          this.successMessage = '';
        }, 5000);
      },
      error: (error) => {
        this.handleError(error);
        this.isLoading = false;
      }
    });
  }

  onUnlinkGoogleAuth(): void {
    const password = prompt('Ingresa tu contraseña para desvincular Google Authenticator:');
    if (!password) return;

    this.isLoading = true;
    this.errorMessage = '';

    this.authService.unlinkGoogleAuthenticator(password).subscribe({
      next: (response) => {
        this.successMessage = response.message;
        this.isLoading = false;
        setTimeout(() => {
          this.loadSetupData();
        }, 2000);
      },
      error: (error) => {
        this.handleError(error);
        this.isLoading = false;
      }
    });
  }

  onCopySecret(): void {
    if (this.setupData?.secret) {
      navigator.clipboard.writeText(this.setupData.secret).then(() => {
        this.successMessage = 'Clave secreta copiada al portapapeles';
        setTimeout(() => {
          this.successMessage = '';
        }, 3000);
      }).catch(() => {
        this.errorMessage = 'No se pudo copiar la clave secreta';
      });
    }
  }

  onDownloadQR(): void {
    if (this.setupData?.qrCodeUrl) {
      const link = document.createElement('a');
      link.href = this.setupData.qrCodeUrl;
      link.download = 'google-auth-qr.png';
      link.target = '_blank';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  }

  private markFormGroupTouched(): void {
    Object.keys(this.setupForm.controls).forEach(key => {
      const control = this.setupForm.get(key);
      control?.markAsTouched();
    });
  }

  private handleError(error: any): void {
    if (error.error?.code) {
      switch (error.error.code) {
        case '2FA_YA_CONFIGURADO':
          this.errorMessage = 'La doble autenticación ya está configurada';
          break;
        case 'CODIGO_INVALIDO':
          this.errorMessage = 'Código de Google Authenticator incorrecto';
          break;
        default:
          this.errorMessage = error.error.message || 'Error desconocido';
      }
    } else {
      this.errorMessage = 'Error de conexión. Verifica tu conexión a internet';
    }
  }

  getFieldError(fieldName: string): string {
    const field = this.setupForm.get(fieldName);
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

  onKeyUp(event: any): void {
    const input = event.target;
    const value = input.value;

    if (value.length === 6) {
      if (this.setupForm.valid) {
        this.onSubmit();
      }
    }
  }

  onKeyPress(event: any): boolean {
    const charCode = event.which ? event.which : event.keyCode;
    if (charCode > 31 && (charCode < 48 || charCode > 57)) {
      return false;
    }
    return true;
  }
}
