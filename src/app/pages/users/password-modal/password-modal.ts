import { Component, Input, Output, EventEmitter, OnChanges, SimpleChanges, ViewChild, ElementRef, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Usuario } from '../../../interfaces/common.interfaces';

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
  @Output() close = new EventEmitter<void>();
  @Output() validate = new EventEmitter<string>();

  @ViewChild('passwordInput') passwordInput!: ElementRef<HTMLInputElement>;

  password = '';
  passwordVisible = false;

  ngOnChanges(changes: SimpleChanges) {
    if (changes['isVisible'] && this.isVisible) {
      this.password = '';
      this.passwordVisible = false;
      setTimeout(() => {
        this.passwordInput?.nativeElement.focus();
      }, 100);
    }
  }

  onCancel(): void {
    this.close.emit();
  }

  onValidate(): void {
    if (this.password.trim()) {
      this.validate.emit(this.password);
    }
  }

  togglePasswordVisibility(): void {
    this.passwordVisible = !this.passwordVisible;
  }

  onKeyPress(event: KeyboardEvent): void {
    if (event.key === 'Enter') {
      this.onValidate();
    }
  }
}