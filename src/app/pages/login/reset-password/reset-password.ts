import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, AbstractControl, ValidationErrors } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { Router, ActivatedRoute } from '@angular/router';
import { PasswordResetService } from '../../../services/password-reset.service';
import { PasswordValidator } from '../../../utils/password-validator.util';

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
      newPassword: ['', [Validators.required, PasswordValidator.validator()]],
      confirmPassword: ['', [Validators.required]]
    }, { validators: this.passwordMatchValidator });

    this.route.queryParams.subscribe(params => {
      this.token = params['token'] || '';
      if (this.token) {
        this.validateToken();
      }
    });
  }

  passwordStrengthValidator(control: AbstractControl): ValidationErrors | null {
    if (!control.value) {
      return null;
    }

    const password = control.value;
    const errors: ValidationErrors = {};

    if (password.length < 10) {
      errors['minLength'] = true;
    }

    if (!/[A-Z]/.test(password)) {
      errors['noUppercase'] = true;
    }

    if (!/[a-z]/.test(password)) {
      errors['noLowercase'] = true;
    }

    if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
      errors['noSpecialChar'] = true;
    }

    if (this.userInfo) {
      const lowerPassword = password.toLowerCase();
      const usuario = (this.userInfo.usuario || '').toLowerCase();
      const nombres = (this.userInfo.nombres || '').toLowerCase();
      const apellidos = (this.userInfo.apellidos || '').toLowerCase();
      const email = (this.userInfo.correoEmpresarial || '').toLowerCase().split('@')[0];

      if (usuario && lowerPassword.includes(usuario)) {
        errors['containsPersonalData'] = true;
      }
      if (nombres && lowerPassword.includes(nombres)) {
        errors['containsPersonalData'] = true;
      }
      if (apellidos && lowerPassword.includes(apellidos)) {
        errors['containsPersonalData'] = true;
      }
      if (email && lowerPassword.includes(email)) {
        errors['containsPersonalData'] = true;
      }
    }

    return Object.keys(errors).length > 0 ? errors : null;
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
      if (field.errors['passwordValidation']) {
        const errors = field.errors['passwordValidation'].errors;
        return PasswordValidator.getErrorMessages(errors);
      }
      if (field.errors['passwordMismatch']) return 'Las contraseñas no coinciden';
    }
    return '';
  }


  isPasswordRequirementMet(requirement: string): boolean {
    const password = this.resetForm.get('newPassword')?.value || '';
    if (!password) return false;
    
    const personalData = this.userInfo ? {
      nombres: this.userInfo.nombres,
      apellidos: this.userInfo.apellidos,
      usuario: this.userInfo.usuario,
      email: this.userInfo.correoEmpresarial
    } : undefined;
    
    const result = PasswordValidator.validate(password, personalData);
    
    // Para "No debe contener datos personales", verificar si hay algún error relacionado
    if (requirement === 'No debe contener datos personales') {
      return !result.errors.some(error => error.includes('No debe contener datos personales'));
    }
    
    // Para otros requisitos, verificar coincidencia exacta
    return !result.errors.some(error => error === requirement);
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
      // Validar contraseña antes de enviar
      const newPassword = this.resetForm.value.newPassword;
      const personalData = this.userInfo ? {
        nombres: this.userInfo.nombres,
        apellidos: this.userInfo.apellidos,
        usuario: this.userInfo.usuario,
        email: this.userInfo.correoEmpresarial
      } : undefined;
      
      const validation = PasswordValidator.validate(newPassword, personalData);
      if (!validation.isValid) {
        this.errorMessage = PasswordValidator.getErrorMessages(validation.errors);
        this.resetForm.get('newPassword')?.setErrors({ passwordValidation: { errors: validation.errors } });
        this.resetForm.markAllAsTouched();
        return;
      }

      this.isLoading = true;
      this.errorMessage = '';
      this.successMessage = '';
      this.showSuccessMessage = false;

      try {
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
