import { Component, Input, Output, EventEmitter, OnChanges, SimpleChanges } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';

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
  @Output() close = new EventEmitter<void>();
  @Output() passwordChanged = new EventEmitter<void>();

  // MODAL 1: Validar contraseña actual
  isValidatePasswordModalVisible = true;
  password = '';
  passwordVisible = false;
  validateError = '';

  // MODAL 2: Cambiar contraseña nueva
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

  // 1. Validar la contraseña actual
  onValidatePassword() {
    if (!this.password || this.password.length < 6) {
      this.validateError = 'Ingrese una contraseña válida.';
      return;
    }
    // Aquí iría la llamada a API para validar la contraseña
    // Si es correcta:
    this.isValidatePasswordModalVisible = false;
    this.isPasswordChangeModalVisible = true;
    this.validateError = '';
    this.password = '';
  }

  // 2. Cambiar contraseña
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
    // Aquí iría la llamada a API para cambiar la contraseña
    // Si es exitosa:
    this.passwordChanged.emit();
  }

  // 3. Mostrar/ocultar contraseña en ambas modales
  togglePasswordVisibility() {
    this.passwordVisible = !this.passwordVisible;
  }
  toggleNewPasswordVisibility() {
    this.newPasswordVisible = !this.newPasswordVisible;
  }
  toggleConfirmPasswordVisibility() {
    this.confirmPasswordVisible = !this.confirmPasswordVisible;
  }

  // 4. Cancelar
  onCancelValidate() {
    this.close.emit();
  }
  onCancelChange() {
    this.close.emit();
  }
}