import { Component, Input, Output, EventEmitter, OnChanges, SimpleChanges, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Usuario } from '../../../interfaces/common.interfaces';
import { AuthService } from '../../../services/auth.service';

@Component({
  selector: 'app-password-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './password-modal.html',
  styleUrls: ['./password-modal.css']
})
export class PasswordModal  {
  @Input() mensajeModal: string = 'Ingrese su contraseña para finalizar la operación.';
  @Input() isVisible = false;
  @Input() user: Usuario | null = null;
  @Input() skipValidation = false;
  @Input() externalError: string = '';
  @Output() close = new EventEmitter<void>();
  @Output() validate = new EventEmitter<string>();
  @Output() validationError = new EventEmitter<string>();

  @ViewChild('passwordInput') passwordInput!: ElementRef<HTMLInputElement>;

  password = '';
  passwordVisible = false;
  isValidating = false;
  errorMessage = '';

  constructor(private authService: AuthService) {}

  ngOnChanges(changes: SimpleChanges) {
    if (changes['isVisible'] && this.isVisible) {
      this.password = '';
      this.passwordVisible = false;
      this.errorMessage = '';
      this.isValidating = false;
      setTimeout(() => {
        this.passwordInput?.nativeElement.focus();
      }, 100);
    }
    if (changes['externalError'] && this.externalError) {
      this.errorMessage = this.externalError;
      this.isValidating = false;
    }
  }

  onCancel(): void {
    this.close.emit();
  }

  onValidate(): void {
    if (!this.password.trim()) {
      this.errorMessage = 'La contraseña no puede estar vacía';
      return;
    }

    if (this.isValidating) {
      return;
    }

    if (this.skipValidation) {
      this.validate.emit(this.password);
      return;
    }

    this.isValidating = true;
    this.errorMessage = '';

    this.authService.validatePassword(this.password).subscribe({
      next: (response) => {
        this.isValidating = false;
        if (response.valid) {
          this.validate.emit(this.password);
        } else {
          this.errorMessage = response.message || 'Contraseña incorrecta';
          this.validationError.emit(this.errorMessage);
        }
      },
      error: (error) => {
        this.isValidating = false;
        this.errorMessage = 'Error al validar la contraseña. Intente nuevamente.';
        this.validationError.emit(this.errorMessage);
        console.error('Error validando contraseña:', error);
      }
    });
  }

  togglePasswordVisibility(): void {
    this.passwordVisible = !this.passwordVisible;
  }
}
