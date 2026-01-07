import { Component, OnInit, Output, EventEmitter, ChangeDetectorRef, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { AuthService } from '../../services/auth.service';
import { RegisterRequest, RegisterResponse, RegisterErrorResponse } from '../../interfaces/common.interfaces';
import { Subject } from 'rxjs';
import { phoneValidator } from '../../utils/phone-validators';
import { SuccessModal } from '../../pages/users/success-modal/success-modal';
import { ErrorModal } from './error-modal';

@Component({
  selector: 'app-user-form-register',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    SuccessModal,
    ErrorModal
  ],
  templateUrl: './user-form-register.html',
  styleUrls: ['./user-form-register.css']
})
export class UserFormRegister implements OnInit, OnDestroy {
  @Output() registered = new EventEmitter<{ idUsuario: number }>();
  @Output() close = new EventEmitter<void>();

  form!: FormGroup;

  loading = false;
  apiError?: string;
  successMessage = '';
  
  modalSuccessVisible = false;
  modalSuccessMessage = '';
  modalSuccessSecondaryMessage = '';
  modalSuccessBtn = 'Aceptar';

  modalErrorVisible = false;
  modalErrorTitulo = 'Error';
  modalErrorMessage = '';
  modalErrorBtn = 'Aceptar';

  private destroy$ = new Subject<void>();

  constructor(
    private fb: FormBuilder, 
    private authService: AuthService, 
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.form = this.fb.group({
      identification: ['', [Validators.required]],
      nombres: ['', [Validators.required]],
      apellidos: ['', [Validators.required]],
      usuario: [{value: '', disabled: true}],
      correoEmpresarial: ['', [Validators.required, Validators.email]],
      correoPersonal: ['', [Validators.email]],
      telefono1: ['', [Validators.required, phoneValidator()]],
      telefono2: ['', [phoneValidator()]],
      direccion: ['']
    });

    this.form.get('nombres')?.valueChanges.subscribe(() => {
      this.generateUsuario();
    });
    this.form.get('apellidos')?.valueChanges.subscribe(() => {
      this.generateUsuario();
    });

  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }


  generateUsuario(): void {
    const nombres = this.form.get('nombres')?.value?.trim() || '';
    const apellidos = this.form.get('apellidos')?.value?.trim() || '';
    
    if (nombres && apellidos) {
      const primerNombre = nombres.split(' ')[0].toLowerCase();
      const primerApellido = apellidos.split(' ')[0].toLowerCase();
      const usuario = `${primerNombre}.${primerApellido}`;
      this.form.get('usuario')?.setValue(usuario);
    }
  }

  getErrorMessage(fieldName: string): string {
    const control = this.form.get(fieldName);
    if (!control || !control.errors || !control.touched) {
      return '';
    }

    const errors = control.errors;
    
    if (errors['server']) {
      return errors['server'];
    }

    if (errors['required']) {
      return 'Este campo es obligatorio';
    }
    if (errors['minlength']) {
      const required = errors['minlength'].requiredLength;
      if (fieldName === 'usuario') {
        return `El usuario debe tener al menos ${required} caracteres`;
      }
    }
    if (errors['maxlength']) {
      const required = errors['maxlength'].requiredLength;
      return `No puede exceder ${required} caracteres`;
    }
    if (errors['pattern']) {
      if (fieldName === 'usuario') {
        return 'Solo se permiten letras, números, puntos, guiones bajos y guiones';
      }
      if (fieldName === 'correoEmpresarial' || fieldName === 'correoPersonal') {
        return 'Ingrese un correo electrónico válido';
      }
    }
    if (errors['phoneLength']) {
      const field = fieldName === 'telefono1' ? 'celular' : 'teléfono';
      return `El ${field} debe tener exactamente 10 dígitos`;
    }
    if (errors['phoneAllSame']) {
      const field = fieldName === 'telefono1' ? 'celular' : 'teléfono';
      return `El ${field} no puede tener todos los dígitos iguales`;
    }
    if (errors['phoneConsecutive']) {
      const field = fieldName === 'telefono1' ? 'celular' : 'teléfono';
      return `El ${field} no puede tener más de 5 dígitos consecutivos iguales`;
    }
    if (errors['phoneInvalid']) {
      const field = fieldName === 'telefono1' ? 'celular' : 'teléfono';
      return `El ${field} solo debe contener números`;
    }
    if (errors['email']) {
      return 'Ingrese un correo electrónico válido';
    }

    return '';
  }

  focusFirstError(): void {
    const invalid = Object.keys(this.form.controls).find(k => this.form.get(k)?.invalid);
    if (!invalid) return;
    const el = document.querySelector(`[formcontrolname="${invalid}"]`) as HTMLElement | null;
    el?.focus();
  }

  private translateErrorMessage(message: string): string {
    if (!message) return message;

    const translations: { [key: string]: string } = {
      'Transaction silently rolled back because it has been marked as rollback-only': 
        'La transacción fue revertida porque ha sido marcada como solo reversión. Por favor, verifica los datos e intenta nuevamente.',
      'Transaction silently rolled back': 
        'La transacción fue revertida. Por favor, verifica los datos e intenta nuevamente.',
      'rollback-only': 
        'La transacción fue revertida. Por favor, verifica los datos e intenta nuevamente.',
      'Error al crear usuario': 
        'Error al crear usuario',
      'Error al actualizar usuario': 
        'Error al actualizar usuario'
    };

    if (translations[message]) {
      return translations[message];
    }

    const lowerMessage = message.toLowerCase();
    for (const [key, value] of Object.entries(translations)) {
      if (lowerMessage.includes(key.toLowerCase())) {
        return value;
      }
    }

    return message;
  }


  onSubmit(): void {
    this.apiError = undefined;
    this.successMessage = '';

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.focusFirstError();
      return;
    }

    this.loading = true;
    const formValue = this.form.getRawValue();

    const registerPayload: any = {
      identificacion: formValue.identification,
      nombres: formValue.nombres,
      apellidos: formValue.apellidos,
      usuario: formValue.usuario,
      password: '',
      correoEmpresarial: formValue.correoEmpresarial,
      telefono1: formValue.telefono1,
      dobleAutenticacion: 'GOOGLE_AUTH'
    };

    if (formValue.correoPersonal) {
      registerPayload.correoPersonal = formValue.correoPersonal;
    }
    if (formValue.telefono2) {
      registerPayload.telefono2 = formValue.telefono2;
    }
    if (formValue.direccion) {
      registerPayload.direccion = formValue.direccion;
    }
    
    this.authService.register(registerPayload).subscribe({
      next: (res: RegisterResponse) => {
        this.loading = false;
        
        this.modalSuccessMessage = `¡Usuario registrado exitosamente! ID: ${res.idUsuario}`;
        this.modalSuccessSecondaryMessage = 'El usuario ha sido registrado y está pendiente de activación por un administrador.';
        this.modalSuccessBtn = 'Aceptar';
        this.modalSuccessVisible = true;
        
        this.registered.emit({ idUsuario: res.idUsuario });
        
        this.cdr.markForCheck();
      },
      error: (err: any) => {
        this.loading = false;
        
        let errorMsg = '';
        const errorResponse = err?.error as RegisterErrorResponse;
        const code = errorResponse?.code;
        
        if (errorResponse && errorResponse.message) {
          errorMsg = errorResponse.message;
        } else if (err.error && typeof err.error === 'string') {
          errorMsg = this.translateErrorMessage(err.error);
        } else if (err.message) {
          errorMsg = err.message;
        } else {
          errorMsg = 'Error de conexión al servidor. Por favor, intenta de nuevo más tarde.';
        }

        if (errorResponse?.details && Array.isArray(errorResponse.details)) {
          const detalles = errorResponse.details.join('\n• ');
          errorMsg += '\n\nDetalles:\n• ' + detalles;
        }
        
        this.apiError = errorMsg;

        if (code === 'USUARIO_EXISTE') {
          this.form.get('usuario')?.setErrors({ server: 'Este nombre de usuario ya está en uso' });
          errorMsg = 'El nombre de usuario ya existe. Por favor, contacta con el administrador.';
        } else if (code === 'IDENTIFICACION_EXISTE') {
          this.form.get('identification')?.setErrors({ server: 'Esta identificación ya está registrada' });
          errorMsg = 'La identificación ya está registrada en el sistema. Si crees que es un error, contacta con el administrador.';
        } else if (code === 'CORREO_EXISTE') {
          this.form.get('correoEmpresarial')?.setErrors({ server: 'Este correo ya está registrado' });
          errorMsg = 'El correo empresarial ya está registrado en el sistema.';
        }

        this.modalErrorTitulo = 'Error al registrar usuario';
        this.modalErrorMessage = errorMsg;
        this.modalErrorVisible = true;
        this.apiError = undefined; 
        this.focusFirstError();
        this.cdr.markForCheck();
      }
    });
  }

  clearSuccessMessage(): void {
    this.successMessage = '';
    this.cdr.markForCheck();
  }

  clearErrorMessage(): void {
    this.apiError = undefined;
    this.modalErrorVisible = false;
    this.cdr.markForCheck();
  }

  cerrarModalError(): void {
    this.modalErrorVisible = false;
    this.apiError = undefined;
    this.cdr.markForCheck();
  }

  closeModal(): void {
    this.form.reset();
    this.apiError = undefined;
    this.successMessage = '';
    this.modalSuccessVisible = false;
    this.close.emit();
  }

  onClose(): void {
    this.closeModal();
  }

  cerrarModalSuccess(): void {
    this.modalSuccessVisible = false;
    this.successMessage = '';
    this.closeModal();
  }

  onIdentificacionKeyPress(event: KeyboardEvent): boolean {
    if (event.key === 'Backspace' || event.key === 'Delete' || event.key === 'Tab' || 
        event.key === 'Escape' || event.key === 'Enter' || event.key === 'ArrowLeft' || 
        event.key === 'ArrowRight' || event.key === 'Home' || event.key === 'End' ||
        (event.ctrlKey || event.metaKey) && (event.key === 'a' || event.key === 'c' || 
        event.key === 'v' || event.key === 'x')) {
      return true;
    }
    
    if (!/[0-9]/.test(event.key)) {
      event.preventDefault();
      return false;
    }
    return true;
  }

  onIdentificacionInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    const value = input.value.replace(/[^0-9]/g, '');
    if (value !== input.value) {
      input.value = value;
      this.form.get('identification')?.setValue(value, { emitEvent: false });
    }
  }
}