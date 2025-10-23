import { Component, OnInit, Output, EventEmitter, ChangeDetectorRef, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { AuthService } from '../../services/auth.service';
import { RegisterRequest, RegisterResponse, RegisterErrorResponse } from '../../interfaces/common.interfaces';
import { Subject } from 'rxjs';

@Component({
  selector: 'app-user-form-register',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule
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

  // Ya no se necesitan datos para selección de cargo
  private destroy$ = new Subject<void>();

  constructor(
    private fb: FormBuilder, 
    private authService: AuthService, 
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.form = this.fb.group({
      identificacion: ['', [Validators.required]],
      nombres: ['', [Validators.required]],
      apellidos: ['', [Validators.required]],
      usuario: [{value: '', disabled: true}],
      correoEmpresarial: ['', [Validators.required, Validators.email]],
      correoPersonal: ['', [Validators.email]],
      telefono1: ['', [Validators.required, Validators.pattern(/^[\d\s\+]+$/)]],
      telefono2: ['', [Validators.pattern(/^[\d\s\+]+$/)]],
      direccion: ['']
    });

    this.form.get('nombres')?.valueChanges.subscribe(() => {
      this.generateUsuario();
    });
    this.form.get('apellidos')?.valueChanges.subscribe(() => {
      this.generateUsuario();
    });

    // Ya no se cargan datos jerárquicos para cargo
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // Métodos relacionados con cargo eliminados

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
      if (fieldName === 'telefono1' || fieldName === 'telefono2') {
        return 'Solo se permiten números, espacios y el símbolo +';
      }
    }
    if (errors['email']) {
      return 'Ingrese un correo electrónico válido';
    }
    // Validaciones de cargo eliminadas

    return '';
  }

  focusFirstError(): void {
    const invalid = Object.keys(this.form.controls).find(k => this.form.get(k)?.invalid);
    if (!invalid) return;
    const el = document.querySelector(`[formcontrolname="${invalid}"]`) as HTMLElement | null;
    el?.focus();
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

    // Construir el payload con la estructura requerida
    const registerPayload: RegisterRequest = {
      identificacion: formValue.identificacion,
      nombres: formValue.nombres,
      apellidos: formValue.apellidos,
      usuario: formValue.usuario,
      password: '', // Será generada por el backend
      correoEmpresarial: formValue.correoEmpresarial,
      correoPersonal: formValue.correoPersonal || '',
      telefono1: formValue.telefono1,
      telefono2: formValue.telefono2 || '',
      direccion: formValue.direccion || '',
      dobleAutenticacion: 'GOOGLE_AUTH'
    };

    this.authService.register(registerPayload).subscribe({
      next: (res: RegisterResponse) => {
        this.loading = false;
        this.successMessage = res.message;
        
        this.registered.emit({ idUsuario: res.idUsuario });
        
        setTimeout(() => {
          this.closeModal();
        }, 2000);
        
        this.cdr.markForCheck();
      },
      error: (err: any) => {
        this.loading = false;
        const errorResponse = err?.error as RegisterErrorResponse;
        const code = errorResponse?.code;
        const msg = errorResponse?.message || 'Error de conexión. Intenta de nuevo.';
        this.apiError = msg;

        if (code === 'USUARIO_EXISTE') {
          this.form.get('usuario')?.setErrors({ server: msg });
        } else if (code === 'IDENTIFICACION_EXISTE') {
          this.form.get('identificacion')?.setErrors({ server: msg });
        } else if (code === 'CORREO_EXISTE') {
          this.form.get('correoEmpresarial')?.setErrors({ server: msg });
        }

        this.focusFirstError();
        this.cdr.markForCheck();
      }
    });
  }

  closeModal(): void {
    this.form.reset();
    this.apiError = undefined;
    this.successMessage = '';
    this.close.emit();
  }

  onClose(): void {
    this.closeModal();
  }
}