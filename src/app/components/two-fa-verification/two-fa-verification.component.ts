import { Component, OnInit, OnDestroy } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { Subject, takeUntil } from 'rxjs';
import { AuthService } from '../../services/auth.service';

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
  twoFAState: any = null;
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
    // Verificar si realmente se requiere 2FA
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

    // Suscribirse al estado de 2FA para mostrar opciones apropiadas
    this.authService.getTwoFAState()
      .pipe(takeUntil(this.destroy$))
      .subscribe(state => {
        if (state) {
          this.twoFAState = state;
        }
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  onSubmit(): void {
    if (this.verificationForm.valid) {
      this.isLoading = true;
      this.errorMessage = '';

      const { codigo } = this.verificationForm.value;

      this.authService.validate2FACode(codigo).subscribe({
        next: (success) => {
          if (success) {
            this.router.navigate(['/']);
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

  onSendEmailCode(): void {
    this.isLoading = true;
    this.errorMessage = '';

    this.authService.sendEmailCode().subscribe({
      next: (response) => {
        console.log('Código enviado por email:', response.message);
        this.errorMessage = '';
        // Mostrar mensaje de éxito (podrías usar un toast o modal)
        alert('Código enviado por email exitosamente');
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error enviando código por email:', error);
        this.handleError(error);
        this.isLoading = false;
      }
    });
  }

  onSetupGoogleAuth(): void {
    this.router.navigate(['/google-auth-setup']);
  }

  onBackToLogin(): void {
    this.authService.clear2FAState();
    this.router.navigate(['/login']);
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
      // Si se completan 6 dígitos, intentar validar automáticamente
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
}

