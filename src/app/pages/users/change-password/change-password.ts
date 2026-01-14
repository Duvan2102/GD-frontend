import { Component, Input, Output, EventEmitter, OnChanges, SimpleChanges, Inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { UserService } from '../../../services/user.service';
import { Usuario } from '../../../interfaces/common.interfaces';
import { PasswordValidator } from '../../../utils/password-validator.util';

@Component({
  selector: 'app-change-password',
  templateUrl: './change-password.html',
  styleUrls: ['./change-password.css'],
  standalone: true,
  imports: [CommonModule, FormsModule]
})
export class ChangePassword implements OnChanges {
  @Input() isVisible: boolean = false;
  @Input() skipValidation: boolean = false;
  @Input() user: Usuario | null = null;
  @Output() close = new EventEmitter<void>();
  @Output() passwordChanged = new EventEmitter<string>();

  constructor(private userService: UserService) {}

  isValidatePasswordModalVisible = true;
  password = '';
  passwordVisible = false;
  validateError = '';

  isPasswordChangeModalVisible = false;
  nuevaPassword = '';
  confirmPassword = '';
  newPasswordVisible = false;
  confirmPasswordVisible = false;
  changePasswordError = '';

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['isVisible'] && this.isVisible) {
      this.resetState();
      if (this.skipValidation) {
        this.isValidatePasswordModalVisible = false;
        this.isPasswordChangeModalVisible = true;
      } else {
        this.isValidatePasswordModalVisible = true;
        this.isPasswordChangeModalVisible = false;
      }
    }
  }

  private resetState(): void {
    this.password = '';
    this.validateError = '';
    this.nuevaPassword = '';
    this.confirmPassword = '';
    this.changePasswordError = '';
    this.passwordVisible = false;
    this.newPasswordVisible = false;
    this.confirmPasswordVisible = false;
  }

  onValidatePassword() {
  if (!this.password || this.password.length < 1) {
    this.validateError = 'Ingrese su contraseña actual.';
    return;
  }

  if (this.user && this.user.idUsuario) {
    this.userService.validarPasswordActual(this.user.idUsuario, this.password)
      .subscribe({
        next: (isValid) => {
          if (isValid) {
            this.isValidatePasswordModalVisible = false;
            this.isPasswordChangeModalVisible = true;
            this.validateError = '';
            this.password = '';
          } else {
            this.validateError = 'Contraseña incorrecta.';
          }
        },
        error: (error) => {
          this.validateError = 'Error al validar la contraseña.';
        }
      });
  }
}
  validatePasswordStrength(password: string): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (password.length < 10) {
      errors.push('La contraseña debe tener al menos 10 caracteres');
    }

    if (!/[A-Z]/.test(password)) {
      errors.push('La contraseña debe incluir al menos una letra mayúscula');
    }

    if (!/[a-z]/.test(password)) {
      errors.push('La contraseña debe incluir al menos una letra minúscula');
    }

    if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
      errors.push('La contraseña debe incluir al menos un signo especial');
    }

    if (this.user) {
      const lowerPassword = password.toLowerCase();
      const usuario = (this.user.usuario || '').toLowerCase();
      const nombres = (this.user.nombres || '').toLowerCase();
      const apellidos = (this.user.apellidos || '').toLowerCase();
      const email = (this.user.correoEmpresarial || '').toLowerCase().split('@')[0];

      if (usuario && lowerPassword.includes(usuario)) {
        errors.push('La contraseña no debe contener tu nombre de usuario');
      }
      if (nombres && lowerPassword.includes(nombres)) {
        errors.push('La contraseña no debe contener tus nombres');
      }
      if (apellidos && lowerPassword.includes(apellidos)) {
        errors.push('La contraseña no debe contener tus apellidos');
      }
      if (email && lowerPassword.includes(email)) {
        errors.push('La contraseña no debe contener tu correo electrónico');
      }
    }

    return { valid: errors.length === 0, errors };
  }

  checkPasswordCondition(condition: string): boolean {
    const password = this.nuevaPassword || '';
    if (!password) return false;

    switch (condition) {
      case 'minLength':
        return password.length >= 10;
      case 'uppercase':
        return /[A-Z]/.test(password);
      case 'lowercase':
        return /[a-z]/.test(password);
      case 'specialChar':
        return /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password);
      case 'noPersonalData':
        if (!this.user) return true;
        const lowerPassword = password.toLowerCase();
        const usuario = (this.user.usuario || '').toLowerCase();
        const nombres = (this.user.nombres || '').toLowerCase();
        const apellidos = (this.user.apellidos || '').toLowerCase();
        const email = (this.user.correoEmpresarial || '').toLowerCase().split('@')[0];
        return !(usuario && lowerPassword.includes(usuario)) &&
               !(nombres && lowerPassword.includes(nombres)) &&
               !(apellidos && lowerPassword.includes(apellidos)) &&
               !(email && lowerPassword.includes(email));
      default:
        return false;
    }
  }

  onChangePassword() {
    if (!this.nuevaPassword || !this.confirmPassword) {
      this.changePasswordError = 'Debes completar ambos campos.';
      return;
    }
    if (this.nuevaPassword !== this.confirmPassword) {
      this.changePasswordError = 'Las contraseñas no coinciden.';
      return;
    }

    // Validar contraseña con los requisitos
    const personalData = this.user ? {
      nombres: this.user.nombres,
      apellidos: this.user.apellidos,
      usuario: this.user.usuario,
      email: this.user.correoEmpresarial
    } : undefined;

    const validation = PasswordValidator.validate(this.nuevaPassword, personalData);
    if (!validation.isValid) {
      this.changePasswordError = PasswordValidator.getErrorMessages(validation.errors);
      return;
    }

    if (this.user && this.user.idUsuario) {
      this.userService.cambiarPasswordUsuario(this.user.idUsuario, this.nuevaPassword)
        .subscribe({
          next: (response: any) => {
            this.passwordChanged.emit(this.nuevaPassword);
          },
          error: (error: any) => {
            console.error('Error cambiando contraseña:', error);
            this.changePasswordError = 'Error al cambiar la contraseña: ' + (error.message || 'Error desconocido');
          }
        });
    } else {
      this.changePasswordError = 'Usuario no válido';
    }
  }

  isPasswordRequirementMet(requirement: string): boolean {
    if (!this.nuevaPassword) return false;
    
    const personalData = this.user ? {
      nombres: this.user.nombres,
      apellidos: this.user.apellidos,
      usuario: this.user.usuario,
      email: this.user.correoEmpresarial
    } : undefined;
    
    const result = PasswordValidator.validate(this.nuevaPassword, personalData);
    
    if (requirement === 'No debe contener datos personales') {
      return !result.errors.some(error => error.includes('No debe contener datos personales'));
    }
    
    return !result.errors.some(error => error === requirement);
  }

  togglePasswordVisibility() {
    this.passwordVisible = !this.passwordVisible;
  }
  toggleNewPasswordVisibility() {
    this.newPasswordVisible = !this.newPasswordVisible;
  }
  toggleConfirmPasswordVisibility() {
    this.confirmPasswordVisible = !this.confirmPasswordVisible;
  }

  onCancelValidate() {
    this.close.emit();
  }
  onCancelChange() {
    this.close.emit();
  }
}
