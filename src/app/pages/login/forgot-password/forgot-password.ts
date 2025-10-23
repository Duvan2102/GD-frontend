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
  isEmailMode = false; // true para email, false para username

  constructor(
    private fb: FormBuilder,
    private passwordResetService: PasswordResetService,
    private router: Router
  ) {
    this.userForm = this.fb.group({
      input: ['', [Validators.required, Validators.minLength(3)]]
    });
  }

  getFieldError(fieldName: string): string {
    const field = this.userForm.get(fieldName);
    if (field && field.errors && field.touched) {
      if (field.errors['required']) return 'Este campo es requerido';
      if (field.errors['minlength']) {
        return this.isEmailMode 
          ? 'El email debe tener al menos 3 caracteres'
          : 'El nombre de usuario debe tener al menos 3 caracteres';
      }
      if (field.errors['email']) return 'Ingrese un email válido';
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
        const input = this.userForm.value.input;
        
        // Enviar email o username según el modo seleccionado
        const response = this.isEmailMode 
          ? await this.passwordResetService.requestPasswordReset(input, undefined).toPromise()
          : await this.passwordResetService.requestPasswordReset(undefined, input).toPromise();
        
        // Mostrar mensaje de éxito
        this.successMessage = `Se han enviado las instrucciones para restablecer su contraseña. Si no recibes el correo en unos minutos, verifica tu carpeta de spam.`;
        this.showSuccessMessage = true;
        
        // Limpiar el formulario después del envío exitoso
        this.userForm.reset();

      } catch (error: any) {
        console.error('Error en solicitud de restablecimiento:', error);
        this.errorMessage = 'Error de conexión. Inténtalo de nuevo.';
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

  toggleInputMode() {
    this.isEmailMode = !this.isEmailMode;
    this.userForm.reset();
    this.errorMessage = '';
    this.successMessage = '';
    this.showSuccessMessage = false;
    
    // Actualizar validaciones según el modo
    const inputControl = this.userForm.get('input');
    if (inputControl) {
      if (this.isEmailMode) {
        inputControl.setValidators([Validators.required, Validators.email]);
      } else {
        inputControl.setValidators([Validators.required, Validators.minLength(3)]);
      }
      inputControl.updateValueAndValidity();
    }
  }

  getInputLabel(): string {
    return this.isEmailMode ? 'Correo electrónico' : 'Nombre de usuario';
  }

  getInputPlaceholder(): string {
    return this.isEmailMode ? 'Ingrese su correo electrónico' : 'Ingrese su nombre de usuario';
  }

  getToggleButtonText(): string {
    return this.isEmailMode ? 'Usar nombre de usuario' : 'Usar correo electrónico';
  }
}
