import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { PasswordResetService, RequestPasswordResetResponse } from '../../../services/password-reset.service';
import { UserValidationService, UserValidationResult } from '../../../services/user-validation.service';

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
    private userValidationService: UserValidationService,
    private router: Router
  ) {
    this.userForm = this.fb.group({
      usuario: ['', [Validators.required, Validators.minLength(3)]]
    });
  }

  getFieldError(fieldName: string): string {
    const field = this.userForm.get(fieldName);
    if (field && field.errors && field.touched) {
      if (field.errors['required']) return 'Este campo es requerido';
      if (field.errors['minlength']) return 'El nombre de usuario debe tener al menos 3 caracteres';
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
        const usuario = this.userForm.value.usuario;
        
        // Primero validar si el usuario existe y está activo
        const validationResult = await this.userValidationService.validateUserByUsername(usuario).toPromise();
        
        if (!validationResult) {
          this.errorMessage = 'Error de conexión. Inténtalo de nuevo.';
          return;
        }

        if (!validationResult.exists) {
          this.errorMessage = validationResult.message || 'El usuario ingresado no está registrado en nuestro sistema.';
          return;
        }

        if (!validationResult.isActive) {
          this.errorMessage = validationResult.message || 'Su cuenta se encuentra inactiva. Por favor, contacte al administrador del sistema.';
          return;
        }

        // Si el usuario existe y está activo, obtener su correo empresarial y proceder con el envío
        const correoEmpresarial = validationResult.user?.correoEmpresarial;
        
        if (!correoEmpresarial) {
          this.errorMessage = 'El usuario no tiene un correo empresarial registrado. Por favor, contacte al administrador del sistema.';
          return;
        }

        // Enviar el correo al correo empresarial
        const response = await this.passwordResetService.requestPasswordReset(correoEmpresarial).toPromise();
        
        // Mostrar mensaje de éxito
        this.successMessage = `Se han enviado las instrucciones para restablecer su contraseña a su correo empresarial (${correoEmpresarial}). Si no recibes el correo en unos minutos, verifica tu carpeta de spam.`;
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
}
