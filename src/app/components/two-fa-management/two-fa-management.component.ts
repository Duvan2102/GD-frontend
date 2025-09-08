import { Component, OnInit, OnDestroy } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { Subject, takeUntil } from 'rxjs';
import { AuthService } from '../../services/auth.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-two-fa-management',
  standalone: true,
  imports: [ReactiveFormsModule, CommonModule],
  templateUrl: './two-fa-management.component.html',
  styleUrls: ['./two-fa-management.component.css']
})
export class TwoFAManagementComponent implements OnInit, OnDestroy {
  disableForm: FormGroup;
  errorMessage: string = '';
  successMessage: string = '';
  isLoading: boolean = false;
  currentUser: any = null;
  loginStats: string = '';
  private destroy$ = new Subject<void>();

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router
  ) {
    this.disableForm = this.fb.group({
      password: ['', [Validators.required, Validators.minLength(4)]]
    });
  }

  ngOnInit(): void {
    // Obtener usuario actual
    this.authService.getCurrentUser()
      .pipe(takeUntil(this.destroy$))
      .subscribe(user => {
        this.currentUser = user;
      });

    // Cargar estadísticas de login
    this.loadLoginStats();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadLoginStats(): void {
    this.authService.getLoginStats().subscribe({
      next: (response: { message: string }) => {
        this.loginStats = response.message;
      },
      error: (error: any) => {
        console.error('Error cargando estadísticas:', error);
      }
    });
  }

  onSetupGoogleAuth(): void {
    this.router.navigate(['/google-auth-setup']);
  }

  onDisable2FA(): void {
    if (this.disableForm.valid) {
      this.isLoading = true;
      this.errorMessage = '';
      this.successMessage = '';

      const { password } = this.disableForm.value;

      this.authService.disable2FA(password).subscribe({
        next: (response: { message: string }) => {
          this.successMessage = response.message;
          this.isLoading = false;
          this.disableForm.reset();

          // Recargar estadísticas después de deshabilitar
          setTimeout(() => {
            this.loadLoginStats();
          }, 1000);
        },
        error: (error: any) => {
          console.error('Error deshabilitando 2FA:', error);
          this.handleError(error);
          this.isLoading = false;
        }
      });
    } else {
      this.markFormGroupTouched();
    }
  }

  onUnlockUser(): void {
    this.isLoading = true;
    this.errorMessage = '';
    this.successMessage = '';

    this.authService.unlockUser().subscribe({
      next: (response: { message: string }) => {
        this.successMessage = response.message;
        this.isLoading = false;

        // Recargar estadísticas después de desbloquear
        setTimeout(() => {
          this.loadLoginStats();
        }, 1000);
      },
      error: (error: any) => {
        console.error('Error desbloqueando usuario:', error);
        this.handleError(error);
        this.isLoading = false;
      }
    });
  }

  onRefreshStats(): void {
    this.loadLoginStats();
  }

  private markFormGroupTouched(): void {
    Object.keys(this.disableForm.controls).forEach(key => {
      const control = this.disableForm.get(key);
      control?.markAsTouched();
    });
  }

  private handleError(error: any): void {
    if (error.error?.code) {
      switch (error.error.code) {
        case 'PASSWORD_INCORRECT':
          this.errorMessage = 'Contraseña incorrecta';
          break;
        case '2FA_DISABLED':
          this.errorMessage = 'La doble autenticación no está habilitada';
          break;
        default:
          this.errorMessage = error.error.message || 'Error desconocido';
      }
    } else {
      this.errorMessage = 'Error de conexión. Verifica tu conexión a internet';
    }
  }

  getFieldError(fieldName: string): string {
    const field = this.disableForm.get(fieldName);
    if (field?.errors && field.touched) {
      if (field.errors['required']) {
        return 'Contraseña es requerida';
      }
      if (field.errors['minlength']) {
        return 'La contraseña debe tener al menos 4 caracteres';
      }
    }
    return '';
  }

  // Verificar si el usuario tiene 2FA habilitado
  is2FAEnabled(): boolean {
    return this.currentUser?.dobleAutenticacion || false;
  }

  // Obtener el estado de 2FA como texto
  get2FAStatusText(): string {
    return this.is2FAEnabled() ? 'Habilitado' : 'Deshabilitado';
  }

  // Obtener la clase CSS para el estado
  get2FAStatusClass(): string {
    return this.is2FAEnabled() ? 'status-enabled' : 'status-disabled';
  }
}

