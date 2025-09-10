import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [ReactiveFormsModule, CommonModule],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css']
})
export class LoginComponent implements OnInit {
  loginForm: FormGroup;
  errorMessage: string = '';
  isLoading: boolean = false;
  testUsers: any[] = [];

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router
  ) {
    this.loginForm = this.fb.group({
      usuario: ['', [Validators.required]],
      password: ['', [Validators.required, Validators.minLength(4)]]
    });
  }

  ngOnInit(): void {
    // Si ya está autenticado, redirigir al inicio
    if (this.authService.getCurrentUserValue()) {
      this.router.navigate(['/']);
    }

    // Cargar usuarios de prueba (solo los activos)
    // Mostrar solo los primeros 5
  }

  onSubmit(): void {
    if (this.loginForm.valid) {
      this.isLoading = true;
      this.errorMessage = '';

      const { usuario, password } = this.loginForm.value;

      // Usar el método de login con 2FA OBLIGATORIO (actualizado)
      this.authService.loginWith2FA(usuario, password).subscribe({
        next: (response) => {
          console.log('Login response:', response);
          console.log('Response details:', {
            success: response.success,
            requires2FA: response.requires2FA,
            dobleAutenticacion: response.dobleAutenticacion,
            tempToken: response.tempToken
          });

          if (response.success && response.requires2FA) {
            // Siempre requiere 2FA - verificar estado para determinar el flujo
            console.log('2FA required, navigating to state check...');
            this.router.navigate(['/two-fa-state']).then(navigated => {
              console.log('Navigation to two-fa-state result:', navigated);
            });
          } else {
            console.log('Unexpected response state:', response);
          }
          this.isLoading = false;
        },
        error: (error) => {
          console.error('Error en login:', error);
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

  fillTestUser(user: any): void {
    this.loginForm.patchValue({
      usuario: user.usuario,
      password: '1234' // Contraseña por defecto para usuarios de prueba
    });
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
        default:
          this.errorMessage = error.error.message || 'Error de autenticación';
      }
    } else if (error.status === 429) {
      this.errorMessage = 'Demasiados intentos. Usuario bloqueado temporalmente';
    } else if (error.status === 0) {
      this.errorMessage = 'Error de conexión. Verifica tu conexión a internet';
    } else {
      this.errorMessage = 'Error inesperado. Intenta nuevamente';
    }
  }
}
