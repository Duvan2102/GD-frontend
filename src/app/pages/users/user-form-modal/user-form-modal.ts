// user-form-modal.ts - Componente optimizado sin duplicados
import { Component, Input, Output, EventEmitter, OnChanges, SimpleChanges, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators, AbstractControl } from '@angular/forms';
import { Subject, takeUntil, debounceTime, distinctUntilChanged } from 'rxjs';
import { Usuario } from '../users';
import { UserService } from '../../../services/user.service';

@Component({
  selector: 'app-user-form-modal',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule
  ],
  templateUrl: './user-form-modal.html',
  styleUrls: ['./user-form-modal.css']
})
export class UserFormModal implements OnChanges, OnDestroy {
  @Input() isVisible = false;
  @Input() user: Usuario | null = null;
  @Input() isEditMode = false;
  @Output() close = new EventEmitter<void>();
  @Output() save = new EventEmitter<Usuario>();
  @Output() userCreated = new EventEmitter<Usuario>();
  @Output() userUpdated = new EventEmitter<Usuario>();
  userForm!: FormGroup;
  dobleAutenticacionOptions = [
    { value: 'Google Authenticator', label: 'Google Authenticator' },
    { value: 'Token de Seguridad', label: 'Token de Seguridad' },
    { value: 'SMS', label: 'SMS' },
    { value: 'Email', label: 'Email' }
  ];
  cargosDisponibles: string[] = [];
  isLoading = false;
  errorMessage = '';
  successMessage = '';
  validatingUser = false;
  private destroy$ = new Subject<void>();
  constructor(
    private fb: FormBuilder,
    private userService: UserService
  ) {
    this.initializeForm();
    this.loadCargosDisponibles();
    this.setupFormValidations();
  }
  ngOnChanges(changes: SimpleChanges): void {
    if (changes['isVisible'] && this.isVisible) {
      this.resetMessages();
      this.loadFormData();
    }
  }
  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
  private initializeForm(): void {
    this.userForm = this.fb.group({
      noUsuario: [null],
      identificacion: ['', [Validators.required, Validators.pattern(/^\d{6,12}$/)]],
      nombres: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(50)]],
      apellidos: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(50)]],
      usuario: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(20)]],
      cargo: ['', Validators.required],
      correoEmpresarial: ['', [Validators.required, Validators.email]],
      correoPersonal: ['', [Validators.email]],
      celular: ['', [Validators.required, Validators.pattern(/^\+?[\d\s\-()]{10,15}$/)]],
      telefono: ['', [Validators.pattern(/^\+?[\d\s\-()]{10,15}$/)]],
      direccion: ['', [Validators.maxLength(200)]],
      dobleAutenticacion: ['Google Authenticator', Validators.required],
      perfiles: this.fb.group({
        administrador: [false],
        funcionarioCreador: [false],
        funcionarios: [false]
      })
    });
  }
  private setupFormValidations(): void {
    this.userForm.get('identificacion')?.valueChanges
      .pipe(
        debounceTime(500),
        distinctUntilChanged(),
        takeUntil(this.destroy$)
      )
      .subscribe(identificacion => {
        if (identificacion && identificacion.length >= 6) {
          this.validateUniqueIdentification(identificacion);
        }
      });
    const nombresControl = this.userForm.get('nombres');
    const apellidosControl = this.userForm.get('apellidos');    
    if (nombresControl && apellidosControl) {
      [nombresControl, apellidosControl].forEach(control => {
        control.valueChanges
          .pipe(
            debounceTime(300),
            takeUntil(this.destroy$)
          )
          .subscribe(() => {
            if (!this.isEditMode) {
              this.generateUsername();
            }
          });
      });
    }
  }
  private loadFormData(): void {
    if (this.isEditMode && this.user) {
      this.userForm.patchValue({
        ...this.user,
        perfiles: {
          administrador: this.user.perfiles?.administrador || false,
          funcionarioCreador: this.user.perfiles?.funcionarioCreador || false,
          funcionarios: this.user.perfiles?.funcionarios || false
        }
      });
    } else {
      this.resetForm();
    }
  }
  private loadCargosDisponibles(): void {
    this.cargosDisponibles = this.userService.obtenerCargosDisponibles();
  }
  private validateUniqueIdentification(identificacion: string): void {
    this.validatingUser = true;    
    this.userService.validarUsuarioExistente(identificacion, this.user?.noUsuario)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (exists) => {
          const control = this.userForm.get('identificacion');
          if (exists && control) {
            control.setErrors({ ...control.errors, userExists: true });
          }
          this.validatingUser = false;
        },
        error: () => {
          this.validatingUser = false;
        }
      });
  }
  private generateUsername(): void {
    const nombres = this.userForm.get('nombres')?.value?.trim();
    const apellidos = this.userForm.get('apellidos')?.value?.trim();    
    if (nombres && apellidos) {
      const username = (nombres.split(' ')[0] + '.' + apellidos.split(' ')[0])
        .toLowerCase()
        .replace(/[^a-z.]/g, '');      
      this.userForm.get('usuario')?.setValue(username, { emitEvent: false });
    }
  }
  onSave(): void {
    this.resetMessages();
    if (this.userForm.invalid) {
      this.markFormGroupTouched();
      this.errorMessage = 'Por favor, corrige los errores en el formulario.';
      return;
    }
    this.isLoading = true;
    const usuarioData: Usuario = this.userForm.value;
    const operacion = this.isEditMode 
      ? this.userService.actualizarUsuario(usuarioData)
      : this.userService.crearUsuario(usuarioData);
    operacion
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          console.log('Operación exitosa:', response);          
          this.successMessage = this.isEditMode 
            ? 'Usuario actualizado correctamente' 
            : 'Usuario creado correctamente';
          if (this.isEditMode) {
            this.userUpdated.emit(usuarioData);
          } else {
            this.userCreated.emit(usuarioData);
          }          
          this.save.emit(usuarioData);
          setTimeout(() => {
            this.onClose();
          }, 1500);
        },
        error: (error) => {
          console.error('Error en operación:', error);
          this.errorMessage = error.message || 'Error inesperado al procesar la solicitud';
          this.isLoading = false;
        },
        complete: () => {
          this.isLoading = false;
        }
      });
  }
  onClose(): void {
    this.resetMessages();
    this.resetForm();
    this.isLoading = false;
    this.close.emit();
  }
  private resetForm(): void {
    this.userForm.reset({
      dobleAutenticacion: 'Google Authenticator',
      perfiles: {
        administrador: false,
        funcionarioCreador: false,
        funcionarios: false
      }
    });
  }
  private resetMessages(): void {
    this.errorMessage = '';
    this.successMessage = '';
  }
  private markFormGroupTouched(): void {
    Object.keys(this.userForm.controls).forEach(key => {
      const control = this.userForm.get(key);
      control?.markAsTouched();
      control?.markAsDirty();
      if (control instanceof FormGroup) {
        Object.keys(control.controls).forEach(subKey => {
          control.get(subKey)?.markAsTouched();
          control.get(subKey)?.markAsDirty();
        });
      }
    });
  }
  get modalTitle(): string {
    return this.isEditMode ? 'Editar Usuario' : 'Agregar Usuario';
  }
  get submitButtonText(): string {
    if (this.isLoading) {
      return this.isEditMode ? 'Guardando...' : 'Creando...';
    }
    return this.isEditMode ? 'Guardar Cambios' : 'Crear Usuario';
  }
  hasError(controlName: string, errorType: string): boolean {
    const control = this.userForm.get(controlName);
    return !!(control && control.hasError(errorType) && (control.dirty || control.touched));
  }
  getErrorMessage(controlName: string): string {
    const control = this.userForm.get(controlName);
    if (!control?.errors) return '';
    const errors = control.errors;
    const errorMessages: { [key: string]: { [key: string]: string } } = {
      identificacion: {
        required: 'La identificación es requerida',
        pattern: 'La identificación debe tener entre 6 y 12 dígitos',
        userExists: 'Ya existe un usuario con esta identificación'
      },
      nombres: {
        required: 'Los nombres son requeridos',
        minlength: 'Los nombres deben tener al menos 2 caracteres',
        maxlength: 'Los nombres no pueden exceder 50 caracteres'
      },
      correoEmpresarial: {
        required: 'El correo empresarial es requerido',
        email: 'Ingresa un correo electrónico válido'
      },
      celular: {
        required: 'El número de celular es requerido',
        pattern: 'Ingresa un número de celular válido'
      }
    };
    const fieldErrors = errorMessages[controlName];
    if (fieldErrors) {
      for (const errorType in errors) {
        if (fieldErrors[errorType]) {
          return fieldErrors[errorType];
        }
      }
    }
    return 'Campo inválido';
  }
}