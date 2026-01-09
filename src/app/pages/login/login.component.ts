import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../services/auth.service';
import { UserFormRegister } from '../../components/user-form-register/user-form-register';
import { SuccessModal } from '../users/success-modal/success-modal';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [ReactiveFormsModule, CommonModule, UserFormRegister, SuccessModal],
  templateUrl: './login.component.html',
  styleUrls: ['./shared-login-styles.css']
})
export class LoginComponent implements OnInit {
  loginForm: FormGroup;
  errorMessage: string = '';
  isLoading: boolean = false;
  isRegisterModalVisible = false;
  tokenExpiredMessage: string = '';
  modalSuccessVisible = false;
  modalSuccessMessage = '';
  modalSuccessSecondaryMessage = '';
  modalSuccessBtn = 'Aceptar';

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router,
    private route: ActivatedRoute
  ) {
    this.loginForm = this.fb.group({
      usuario: ['', [Validators.required]],
      password: ['', [Validators.required, Validators.minLength(4)]]
    });
  }

  ngOnInit(): void {
    this.route.queryParams.subscribe(params => {
      if (params['expired'] === 'true') {
        this.tokenExpiredMessage = 'Su sesión ha expirado. Por favor, inicie sesión nuevamente.';
        
        setTimeout(() => {
          this.tokenExpiredMessage = '';
          this.router.navigate(['/login'], { replaceUrl: true });
        }, 5000);
      }
    });

    if (this.authService.getCurrentUserValue()) {
      this.router.navigate(['/']);
    }
  }

  onSubmit(): void {
    if (this.isLoading) {
      return;
    }

    if (this.loginForm.valid) {
      this.isLoading = true;
      this.errorMessage = '';

      const { usuario, password } = this.loginForm.value;
      const usuarioLowercase = usuario.toLowerCase();

      this.authService.loginWith2FA(usuarioLowercase, password).subscribe({
        next: (response) => {
          if (response.success && response.requires2FA) {
            this.router.navigate(['/two-fa-state']);
          }
          this.isLoading = false;
        },
        error: (error) => {
          console.error('Error en login:', error);
          this.authService.clear2FAState();
          this.handleLoginError(error);
          this.isLoading = false;
        }
      });
    } else {
      this.markFormGroupTouched();
    }
  }

  private markFormGroupTouched(): void {
    Object.keys(this.loginForm.controls).forEach(key => {
      const control = this.loginForm.get(key);
      control?.markAsTouched();
    });
  }

  getFieldError(fieldName: string): string {
    const field = this.loginForm.get(fieldName);
    if (field?.errors && field.touched) {
      if (field.errors['required']) {
        return `${fieldName === 'usuario' ? 'Usuario' : 'Contraseña'} es requerido`;
      }
      if (field.errors['minlength']) {
        return 'La contraseña debe tener al menos 4 caracteres';
      }
    }
    return '';
  }

  onUsuarioInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    const value = input.value.toLowerCase();
    this.loginForm.patchValue({ usuario: value }, { emitEvent: false });
  }


  goToForgotPassword(): void {
    this.router.navigate(['/forgot-password']);
  }

  openRegisterModal(): void {
    this.isRegisterModalVisible = true;
  }

  closeRegisterModal(): void {
    this.isRegisterModalVisible = false;
  }

  handleUserRegistered(event: { idUsuario: number }): void {
    this.closeRegisterModal();
    
    this.modalSuccessMessage = `¡Usuario registrado exitosamente! ID: ${event.idUsuario}`;
    this.modalSuccessSecondaryMessage = 'El usuario ha sido registrado y está pendiente de activación por un administrador.';
    this.modalSuccessBtn = 'Aceptar';
    this.modalSuccessVisible = true;
  }

  cerrarModalSuccess(): void {
    this.modalSuccessVisible = false;
    this.modalSuccessMessage = '';
    this.modalSuccessSecondaryMessage = '';
  }

  private handleLoginError(error: any): void {
    if (error.error?.code) {
      switch (error.error.code) {
        case 'CREDENCIALES_INVALIDAS':
          this.errorMessage = 'Usuario o contraseña incorrectos';
          break;
        case 'USUARIO_BLOQUEADO':
          this.errorMessage = 'Usuario bloqueado. Intenta más tarde';
          break;
        case 'USUARIO_INACTIVO':
          this.errorMessage = 'Cuenta inactiva. Contacte al administrador para reactivarla.';
          break;
        case '2FA_DISABLED':
          this.errorMessage = 'La doble autenticación no está configurada correctamente. Contacta al administrador.';
          break;
        case 'EMAIL_NOT_CONFIGURED':
          this.errorMessage = 'El correo electrónico no está configurado. Contacta al administrador.';
          break;
        default:
          const errorMsg = error.error.message || '';
          if (errorMsg.toLowerCase().includes('user is disabled')) {
            this.errorMessage = 'Usuario deshabilitado. Contacta al administrador.';
          } else {
            this.errorMessage = errorMsg || 'Error de autenticación';
          }
      }
    } else if (error.error?.message) {
      const errorMsg = error.error.message;
      if (errorMsg.toLowerCase().includes('user is disabled')) {
        this.errorMessage = 'Usuario deshabilitado. Contacta al administrador.';
      } else {
        this.errorMessage = errorMsg;
      }
    } else if (error.status === 500) {
      this.errorMessage = 'Error del servidor. Si el problema persiste, contacta al administrador del sistema.';
    } else if (error.status === 429) {
      this.errorMessage = 'Demasiados intentos. Usuario bloqueado temporalmente';
    } else if (error.status === 0) {
      this.errorMessage = 'Error de conexión. Verifica tu conexión a internet';
    } else {
      this.errorMessage = 'Error inesperado. Intenta nuevamente';
    }
  }
}
