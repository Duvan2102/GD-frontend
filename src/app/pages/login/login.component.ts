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
    this.testUsers = this.authService.getAllUsers()
      .filter(user => user.activo)
      .slice(0, 5); // Mostrar solo los primeros 5
  }

  onSubmit(): void {
    if (this.loginForm.valid) {
      this.isLoading = true;
      this.errorMessage = '';

      const { usuario, password } = this.loginForm.value;

      // Usar el método de login que consume el backend real
      this.authService.login(usuario, password).subscribe({
        next: (success) => {
          console.log('Login response:', success);
          console.log('Current user after login:', this.authService.getCurrentUserValue());
          console.log('Is authenticated:', this.authService.isAuthenticated());

          if (success) {
            console.log('Navigating to home...');
            this.router.navigate(['/']).then(navigated => {
              console.log('Navigation result:', navigated);
            });
          }
          this.isLoading = false;
        },
        error: (error) => {
          console.error('Error en login:', error);
          this.errorMessage = 'Usuario o contraseña incorrectos';
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
}
