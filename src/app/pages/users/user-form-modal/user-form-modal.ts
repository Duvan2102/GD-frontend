// user-form-modal.ts - Componente optimizado con alertas del servidor
import { Component, Input, Output, EventEmitter, OnChanges, SimpleChanges, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators, AbstractControl } from '@angular/forms';
import { Subject, takeUntil, debounceTime, distinctUntilChanged } from 'rxjs';
import { Usuario } from '../../../interfaces/common.interfaces';
import { UserService } from '../../../services/user.service';
import { Position } from '../../../services/positions.service';

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
export class UserFormModal implements OnInit, OnChanges, OnDestroy {
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
  ];
  cargosDisponibles: Position[] = [];
  
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
    this.setupFormValidations();
  }

  ngOnInit(): void {
    this.loadCargosDisponibles();
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
      let cargoValue = '';
      if (this.user.cargo) {
        if (typeof this.user.cargo === 'string' && !isNaN(Number(this.user.cargo))) {
          const cargoId = Number(this.user.cargo);
          const cargoEncontrado = this.cargosDisponibles.find(c => c.idCargo === cargoId);
          cargoValue = (cargoEncontrado && cargoEncontrado.idCargo) ? cargoEncontrado.idCargo.toString() : this.user.cargo;
        } else {
          const cargoEncontrado = this.cargosDisponibles.find(c => c.descripcion === this.user?.cargo);
          cargoValue = (cargoEncontrado && cargoEncontrado.idCargo) 
          ? cargoEncontrado.idCargo.toString() 
          : (typeof this.user.cargo === 'number' ? this.user.cargo.toString() : (this.user.cargo || ''));
      }
    }
  }
}
  private nameCargoControl(): void {
    const cargoControl = this.userForm.get('cargo');
    if (cargoControl) {
      cargoControl.valueChanges
        .pipe(
          debounceTime(300),
          takeUntil(this.destroy$)
        )
        .subscribe(() => {
          if (!this.isEditMode) {
            this.generateUsername();
          }
        });
    }
  }

  private loadCargosDisponibles(): void {
    this.userService.obtenerCargosDisponibles()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (cargos: Position[]) => {
          this.cargosDisponibles = cargos;
          if (this.isEditMode && this.user) {
            this.loadFormData();
          }
        },
        error: (error) => {
          console.error('Error cargando cargos:', error);
          this.cargosDisponibles = [
            { 
              idCargo: 1, 
              descripcion: 'Gerente', 
              area: { 
                idArea: 1, 
                descripcion: 'Gerencia', 
                departamento: { idDepartamento: 1, descripcion: 'Administración' } 
              } 
            },
            { 
              idCargo: 2, 
              descripcion: 'Analista', 
              area: { 
                idArea: 2, 
                descripcion: 'Análisis', 
                departamento: { idDepartamento: 1, descripcion: 'Administración' } 
              } 
            },
            { 
              idCargo: 3, 
              descripcion: 'Desarrollador', 
              area: { 
                idArea: 3, 
                descripcion: 'Desarrollo', 
                departamento: { idDepartamento: 2, descripcion: 'Tecnología' } 
              } 
            },
            { 
              idCargo: 4, 
              descripcion: 'Administrador', 
              area: { 
                idArea: 4, 
                descripcion: 'Administración', 
                departamento: { idDepartamento: 1, descripcion: 'Administración' } 
              } 
            },
            { 
              idCargo: 5, 
              descripcion: 'Funcionario', 
              area: { 
                idArea: 5, 
                descripcion: 'General', 
                departamento: { idDepartamento: 1, descripcion: 'Administración' } 
              } 
            }
          ];
          if (this.isEditMode && this.user) {
            this.loadFormData();
          }
        }
      });
  }

  private validateUniqueIdentification(identificacion: string): void {
    this.validatingUser = true;
    this.userService.verificarUsuarioExiste(identificacion)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (exists) => {
          const control = this.userForm.get('identificacion');
          if (exists && control) {
            if (!this.isEditMode || this.user?.identificacion !== identificacion) {
              control.setErrors({ ...control.errors, userExists: true });
            }
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

    const cargoSeleccionado = this.userForm.get('cargo')?.value;
    let cargoParaEnviar: string = '';
    
    if (cargoSeleccionado) {
      if (typeof cargoSeleccionado === 'number' || !isNaN(Number(cargoSeleccionado))) {
        const cargoId = typeof cargoSeleccionado === 'number' ? cargoSeleccionado : Number(cargoSeleccionado);
        const cargoEncontrado = this.cargosDisponibles.find(c => c.idCargo === cargoId);
        cargoParaEnviar = cargoEncontrado?.descripcion || 'Funcionario';
      } else {
        cargoParaEnviar = cargoSeleccionado;
      }
    } else {
      cargoParaEnviar = 'Funcionario';
    }

    const usuarioCompleto: Usuario = {
      ...usuarioData,
      cargo: cargoParaEnviar,
      correoEmpresarial: usuarioData.correoEmpresarial || '',
      celular: usuarioData.celular || '',
      dobleAutenticacion: usuarioData.dobleAutenticacion || 'Google Authenticator',
      estado: this.isEditMode ? (this.user?.estado || 'Activo') : 'Activo',
      activo: this.isEditMode ? (this.user?.activo || true) : true
    };

    const operacion = this.isEditMode 
      ? this.userService.actualizarUsuario(usuarioCompleto)
      : this.userService.crearUsuario(usuarioCompleto);

    operacion
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          console.log('Operación exitosa:', response);
          
          this.successMessage = response?.message || 
            (this.isEditMode ? 'Usuario actualizado correctamente' : 'Usuario creado correctamente');
          
          if (this.isEditMode) {
            this.userUpdated.emit(usuarioCompleto);
          } else {
            this.userCreated.emit(usuarioCompleto);
          }          
          
          this.save.emit(usuarioCompleto);
          
          setTimeout(() => {
            this.onClose();
          }, 2000);
        },
        error: (error) => {
          console.error('Error en operación:', error);
          
          if (error && typeof error === 'object') {
            this.errorMessage = error.message || 'Error inesperado al procesar la solicitud';
            
            if (error.details && error.details.length > 0) {
              this.errorMessage += '\n• ' + error.details.join('\n• ');
            }
          } else {
            this.errorMessage = typeof error === 'string' ? error : 'Error inesperado al procesar la solicitud';
          }
          
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
      apellidos: {
        required: 'Los apellidos son requeridos',
        minlength: 'Los apellidos deben tener al menos 2 caracteres',
        maxlength: 'Los apellidos no pueden exceder 50 caracteres'
      },
      usuario: {
        required: 'El usuario es requerido',
        minlength: 'El usuario debe tener al menos 3 caracteres',
        maxlength: 'El usuario no puede exceder 20 caracteres'
      },
      cargo: {
        required: 'El cargo es requerido'
      },
      correoEmpresarial: {
        required: 'El correo empresarial es requerido',
        email: 'Ingresa un correo electrónico válido'
      },
      correoPersonal: {
        email: 'Ingresa un correo electrónico válido'
      },
      celular: {
        required: 'El número de celular es requerido',
        pattern: 'Ingresa un número de celular válido'
      },
      telefono: {
        pattern: 'Ingresa un número de teléfono válido'
      },
      direccion: {
        maxlength: 'La dirección no puede exceder 200 caracteres'
      },
      dobleAutenticacion: {
        required: 'La doble autenticación es requerida'
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