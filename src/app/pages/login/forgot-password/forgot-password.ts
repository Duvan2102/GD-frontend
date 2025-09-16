import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { PasswordResetService, RequestPasswordResetResponse } from '../../../services/password-reset.service';

@Component({
  selector: 'app-forgot-password',
  standalone: true,
  imports: [ReactiveFormsModule, CommonModule],
  templateUrl: './forgot-password.html',
  styleUrl: '../shared-login-styles.css'
})
export class ForgotPassword {
  userForm: FormGroup;
  isLoading = false;
  errorMessage = '';
  successMessage = '';
  showSuccessMessage = false;

  constructor(
    private fb: FormBuilder,
    private passwordResetService: PasswordResetService,
    private router: Router
  ) {
    this.userForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]]
    });
  }

  getFieldError(fieldName: string): string {
    const field = this.userForm.get(fieldName);
    if (field && field.errors && field.touched) {
      if (field.errors['required']) return 'Este campo es requerido';
      if (field.errors['email']) return 'Por favor ingresa un correo electrónico válido';
    }
    return '';
  }

  async onRequestPasswordReset() {
    if (this.userForm.valid) {
      this.isLoading = true;
      this.errorMessage = '';
      this.successMessage = '';
      this.showSuccessMessage = false;

      try {
        const email = this.userForm.value.email;
        const response = await this.passwordResetService.requestPasswordReset(email).toPromise();
        
        // El servidor siempre devuelve 200 con un mensaje genérico por seguridad
        this.successMessage = response?.message || 'Si el correo electrónico existe en nuestro sistema, recibirá instrucciones para restablecer su contraseña.';
        this.showSuccessMessage = true;
        
        // Limpiar el formulario después del envío exitoso
        this.userForm.reset();

      } catch (error: any) {
        this.errorMessage = error.error?.message || 'Error de conexión. Inténtalo de nuevo.';
      } finally {
        this.isLoading = false;
      }
    } else {
      this.userForm.markAllAsTouched();
    }
  }

  onSubmit() {
    this.onRequestPasswordReset();
  }

  goToLogin() {
    this.router.navigate(['/login']);
  }

  makeAnotherRequest() {
    this.showSuccessMessage = false;
    this.successMessage = '';
    this.errorMessage = '';
    this.userForm.reset();
  }
}
