import { Component, Input, Output, EventEmitter, OnChanges, SimpleChanges, Inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { UserService } from '../../../services/user.service';
import { Usuario } from '../../../interfaces/common.interfaces';

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
  newPassword = '';
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
    this.newPassword = '';
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
  onChangePassword() {
    if (!this.newPassword || !this.confirmPassword) {
      this.changePasswordError = 'Debes completar ambos campos.';
      return;
    }
    if (this.newPassword !== this.confirmPassword) {
      this.changePasswordError = 'Las contraseñas no coinciden.';
      return;
    }
    if (this.newPassword.length < 6) {
      this.changePasswordError = 'La nueva contraseña debe tener al menos 6 caracteres.';
      return;
    }

    if (this.user && this.user.idUsuario) {
      this.userService.cambiarPasswordUsuario(this.user.idUsuario, this.newPassword)
        .subscribe({
          next: (response: any) => {
            console.log('Contraseña cambiada exitosamente:', response);
            this.passwordChanged.emit(this.newPassword);
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
