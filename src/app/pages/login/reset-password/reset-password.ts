import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { Router, ActivatedRoute } from '@angular/router';
import { PasswordResetService } from '../../../services/password-reset.service';

@Component({
  selector: 'app-reset-password',
  standalone: true,
  imports: [ReactiveFormsModule, CommonModule],
  templateUrl: './reset-password.html',
  styleUrl: '../shared-login-styles.css'
})
export class ResetPassword {
  resetForm: FormGroup;
  isLoading = false;
  errorMessage = '';
  successMessage = '';
  showSuccessMessage = false;
  token: string = '';
  userInfo: any = null;
  tokenValid = false;

  constructor(
    private fb: FormBuilder,
    private passwordResetService: PasswordResetService,
    private router: Router,
    private route: ActivatedRoute
  ) {
    this.resetForm = this.fb.group({
      newPassword: ['', [Validators.required, Validators.minLength(6)]],
      confirmPassword: ['', [Validators.required]]
    }, { validators: this.passwordMatchValidator });

    // Obtener token de la URL
    this.route.queryParams.subscribe(params => {
      this.token = params['token'] || '';
      if (this.token) {
        this.validateToken();
      }
    });
  }

  passwordMatchValidator(form: FormGroup) {
    const newPassword = form.get('newPassword');
    const confirmPassword = form.get('confirmPassword');
    
    if (newPassword && confirmPassword && newPassword.value !== confirmPassword.value) {
      confirmPassword.setErrors({ passwordMismatch: true });
      return { passwordMismatch: true };
    }
    
    return null;
  }

  getFieldError(fieldName: string): string {
    const field = this.resetForm.get(fieldName);
    if (field && field.errors && field.touched) {
      if (field.errors['required']) return 'Este campo es requerido';
      if (field.errors['minlength']) return 'La contraseña debe tener al menos 6 caracteres';
      if (field.errors['passwordMismatch']) return 'Las contraseñas no coinciden';
    }
    return '';
  }

  async validateToken() {
    if (!this.token) {
      this.errorMessage = 'Token no válido';
      return;
    }

    try {
      this.isLoading = true;
      this.errorMessage = '';

      const response = await this.passwordResetService.validateToken(this.token).toPromise();
      this.tokenValid = response?.valid || false;

      if (this.tokenValid) {
        await this.getUserInfo();
      } else {
        this.errorMessage = 'Token inválido o expirado';
      }

    } catch (error: any) {
      console.error('Error validating token:', error);
      this.errorMessage = 'Error validando el token. Inténtalo de nuevo.';
    } finally {
      this.isLoading = false;
    }
  }

  async getUserInfo() {
    try {
      const response = await this.passwordResetService.getUserInfoByToken(this.token).toPromise();
      this.userInfo = response;
    } catch (error: any) {
      console.error('Error getting user info:', error);
      this.errorMessage = 'Error obteniendo información del usuario';
    }
  }

  async onResetPassword() {
    if (this.resetForm.valid && this.tokenValid) {
      this.isLoading = true;
      this.errorMessage = '';
      this.successMessage = '';
      this.showSuccessMessage = false;

      try {
        const newPassword = this.resetForm.value.newPassword;

        const response = await this.passwordResetService.resetPassword(this.token, newPassword).toPromise();

        this.successMessage = response?.message || 'Contraseña restablecida exitosamente';
        this.showSuccessMessage = true;
        
        // Limpiar el formulario después del envío exitoso
        this.resetForm.reset();

      } catch (error: any) {
        console.error('Error resetting password:', error);
        this.errorMessage = error.error?.message || 'Error restableciendo la contraseña. Inténtalo de nuevo.';
        this.showSuccessMessage = false;
      } finally {
        this.isLoading = false;
      }
    } else {
      this.resetForm.markAllAsTouched();
    }
  }

  onSubmit() {
    this.onResetPassword();
  }

  goToLogin() {
    this.router.navigate(['/login']);
  }

  goToForgotPassword() {
    this.router.navigate(['/forgot-password']);
  }
}
