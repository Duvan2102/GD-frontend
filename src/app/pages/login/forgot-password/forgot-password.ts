import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { PasswordResetService, UserInfoResponse } from '../../../services/password-reset.service';

@Component({
  selector: 'app-forgot-password',
  standalone: true,
  imports: [ReactiveFormsModule],
  templateUrl: './forgot-password.html',
  styleUrl: './forgot-password.css'
})
export class ForgotPassword {
  userForm: FormGroup;
  passwordForm: FormGroup;
  isLoading = false;
  errorMessage = '';
  successMessage = '';
  userInfo: UserInfoResponse | null = null;
  showPasswordForm = false;

  constructor(
    private fb: FormBuilder,
    private passwordResetService: PasswordResetService,
    private router: Router
  ) {
    console.log('ForgotPassword component initialized');
    this.userForm = this.fb.group({
      userId: ['', [Validators.required, Validators.min(1)]]
    });
    
    this.passwordForm = this.fb.group({
      newPassword: ['', [Validators.required, Validators.minLength(6)]],
      confirmPassword: ['', [Validators.required]]
    }, { validators: this.passwordMatchValidator });
  }

  passwordMatchValidator(form: FormGroup) {
    const password = form.get('newPassword');
    const confirmPassword = form.get('confirmPassword');
    
    if (password && confirmPassword && password.value !== confirmPassword.value) {
      confirmPassword.setErrors({ passwordMismatch: true });
      return { passwordMismatch: true };
    }
    return null;
  }

  getFieldError(fieldName: string, form: FormGroup): string {
    const field = form.get(fieldName);
    if (field && field.errors && field.touched) {
      if (field.errors['required']) return 'Este campo es requerido';
      if (field.errors['minlength']) return 'La contraseña debe tener al menos 6 caracteres';
      if (field.errors['min']) return 'El ID debe ser mayor a 0';
      if (field.errors['passwordMismatch']) return 'Las contraseñas no coinciden';
    }
    return '';
  }

  async onSearchUser() {
    if (this.userForm.valid) {
      this.isLoading = true;
      this.errorMessage = '';
      this.successMessage = '';

      try {
        const userId = this.userForm.value.userId;
        const userInfo = await this.passwordResetService.getUserInfo(userId).toPromise();
        
        this.userInfo = userInfo || null;
        this.showPasswordForm = true;
        this.successMessage = 'Usuario encontrado. Ahora puede cambiar su contraseña.';

      } catch (error: any) {
        console.error('Error getting user info:', error);
        this.errorMessage = error.error?.message || 'Usuario no encontrado';
        this.userInfo = null;
        this.showPasswordForm = false;
      } finally {
        this.isLoading = false;
      }
    } else {
      this.userForm.markAllAsTouched();
    }
  }

  async onChangePassword() {
    if (this.passwordForm.valid && this.userInfo) {
      this.isLoading = true;
      this.errorMessage = '';
      this.successMessage = '';

      try {
        const newPassword = this.passwordForm.value.newPassword;
        
        await this.passwordResetService.changePassword(this.userInfo.idUsuario, newPassword).toPromise();
        
        this.successMessage = 'Contraseña cambiada exitosamente.';
        this.passwordForm.reset();
        this.userForm.reset();
        this.userInfo = null;
        this.showPasswordForm = false;
        
        // Redirigir al login después de 3 segundos
        setTimeout(() => {
          this.router.navigate(['/login']);
        }, 3000);

      } catch (error: any) {
        console.error('Error changing password:', error);
        this.errorMessage = error.error?.message || 'Error al cambiar la contraseña';
      } finally {
        this.isLoading = false;
      }
    } else {
      this.passwordForm.markAllAsTouched();
    }
  }

  goToLogin() {
    this.router.navigate(['/login']);
  }
}
