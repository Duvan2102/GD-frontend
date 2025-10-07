import { Component, Input, Output, EventEmitter, OnChanges, SimpleChanges, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators, AbstractControl } from '@angular/forms';
import { Subject, takeUntil, debounceTime, distinctUntilChanged, forkJoin } from 'rxjs';
import { Usuario } from '../../../interfaces/common.interfaces';
import { UserService } from '../../../services/user.service';
import { AuthService } from '../../../services/auth.service';
import { PositionService, Position } from '../../../services/positions.service';
import { DepartmentService, Department } from '../../../services/department.service';
import { AreaService, Area } from '../../../services/area.service';
import { PasswordModal } from '../password-modal/password-modal';
import { ConfirmModal } from '../confirm-modal/confirm-modal';
import { SuccessModal } from '../success-modal/success-modal';

@Component({
  selector: 'app-user-form-modal',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    PasswordModal,
    ConfirmModal,
    SuccessModal
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
  cargosDisponibles: Position[] = [];
  departamentos: Department[] = [];
  areas: Area[] = [];
  hierarchicalData: any = { departamentos: [] };
  isDropdownOpen = false;
  selectedCargoInfo: Position | null = null;
  originalDobleAutenticacion: string = '';
  isDataLoaded = false;

  isPasswordModalVisible = false;
  confirmModalVisible = false;
  modalSuccessVisible = false;

  mensajePasswordModal = '';
  confirmModalMessage = '';
  modalSuccessMessage = '';
  modalSuccessBtn = 'Aceptar';

  pendingUserData: Usuario | null = null;
  isLoading = false;
  errorMessage = '';
  successMessage = '';
  validatingUser = false;
  private destroy$ = new Subject<void>();

  constructor(
    private fb: FormBuilder,
    private userService: UserService,
    private authService: AuthService,
    private positionService: PositionService,
    private departmentService: DepartmentService,
    private areaService: AreaService
  ) {
    this.initializeForm();
    this.setupFormValidations();
  }

  ngOnInit(): void {
    this.loadHierarchicalData();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['isVisible'] && this.isVisible && this.isDataLoaded) {
      this.resetMessages();
      this.loadFormData();
    }
    if (changes['user'] && this.user && this.isDataLoaded) {
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
      dobleAutenticacion: ['GOOGLE_AUTH', Validators.required],
      perfil: ['funcionarios', Validators.required]
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
        if (identificacion && identificacion.length >= 6 && !this.isEditMode) {
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
        if (typeof this.user.cargo === 'number' || !isNaN(Number(this.user.cargo))) {
          cargoValue = this.user.cargo.toString();
        } else if (typeof this.user.cargo === 'object' && this.user.cargo.idCargo) {
          cargoValue = this.user.cargo.idCargo.toString();
        } else {
          const cargoEncontrado = this.cargosDisponibles.find(
            c => c.descripcion === this.user?.cargo?.descripcion
          );
          cargoValue = (cargoEncontrado && cargoEncontrado.idCargo)
            ? cargoEncontrado.idCargo.toString()
            : '';
        }
      }

      let perfilActivo = 'funcionarios';
      if (this.user.rol && this.user.rol.descripcion) {
        const rolDesc = this.user.rol.descripcion.toUpperCase();
        if (rolDesc === 'ADMINISTRADOR' || rolDesc === 'ADMIN') {
          perfilActivo = 'administrador';
        } else if (rolDesc === 'AUDITOR' || rolDesc === 'FUNCIONARIO CREADOR') {
          perfilActivo = 'funcionarioCreador';
        } else {
          perfilActivo = 'funcionarios';
        }
      } else if (this.user.perfiles) {
        if (this.user.perfiles.administrador) {
          perfilActivo = 'administrador';
        } else if (this.user.perfiles.funcionarioCreador) {
          perfilActivo = 'funcionarioCreador';
        } else if (this.user.perfiles.funcionarios) {
          perfilActivo = 'funcionarios';
        }
      }

      // Determinar el método de 2FA actual
      let dobleAutenticacionValue: 'GOOGLE_AUTH' | 'EMAIL' = 'GOOGLE_AUTH';
      if (this.user.dobleAutenticacion) {
        if (this.user.dobleAutenticacion === 'GOOGLE_AUTH' || this.user.dobleAutenticacion === 'EMAIL') {
          dobleAutenticacionValue = this.user.dobleAutenticacion;
        } else if (typeof this.user.dobleAutenticacion === 'boolean') {
          // Si es boolean, por defecto usar GOOGLE_AUTH
          dobleAutenticacionValue = 'GOOGLE_AUTH';
        }
      }

      this.userForm.patchValue({
        noUsuario: this.user.idUsuario,
        identificacion: this.user.identificacion || '',
        nombres: this.user.nombres || '',
        apellidos: this.user.apellidos || '',
        usuario: this.user.usuario || '',
        cargo: cargoValue,
        correoEmpresarial: this.user.correoEmpresarial || '',
        correoPersonal: this.user.correoPersonal || '',
        celular: this.user.telefono1 || '',
        telefono: this.user.telefono2 || '',
        direccion: this.user.direccion || '',
        dobleAutenticacion: dobleAutenticacionValue,
        perfil: perfilActivo
      });

      // Guardar el valor original para detectar cambios
      this.originalDobleAutenticacion = dobleAutenticacionValue;

      if (this.user.cargo) {
        this.setSelectedCargoFromValue(cargoValue);
      }
      this.userForm.get('identificacion')?.disable();
    } else {
      this.userForm.get('identificacion')?.enable();
      this.resetForm();
    }
  }

  private setSelectedCargoFromValue(cargoValue: string): void {
    if (!cargoValue) return;

    const cargoEncontrado = this.cargosDisponibles.find(cargo =>
      cargo.idCargo?.toString() === cargoValue.toString()
    );
    if (cargoEncontrado) {
      this.selectedCargoInfo = cargoEncontrado;
    } else {
      console.warn('No se encontró el cargo con ID:', cargoValue);
    }
  }

  private loadHierarchicalData(): void {
    this.isLoading = true;

    // Cargar todos los datos para tener la estructura completa
    forkJoin({
      departamentos: this.departmentService.getAll(),
      areas: this.areaService.getAll(),
      cargos: this.positionService.getAll()
    }).pipe(
      takeUntil(this.destroy$)
    ).subscribe({
      next: (data) => {
        this.departamentos = data.departamentos || [];
        this.areas = data.areas || [];
        this.cargosDisponibles = data.cargos || [];

        this.buildHierarchicalStructureComplete();
        this.isLoading = false;
        this.isDataLoaded = true;

        if (this.isEditMode && this.user) {
          this.loadFormData();
        }
      },
      error: (error) => {
        console.error('Error cargando datos jerárquicos:', error);
        this.isLoading = false;
        this.loadFallbackData();
        this.isDataLoaded = true;
      }
    });
  }

  private loadFallbackData(): void {
    this.cargosDisponibles = [
      {
        idCargo: 1,
        descripcion: "Analista de Desarrollo",
        area: {
          idArea: 7,
          descripcion: "Aplicaciones internas",
          departamento: {
            idDepartamento: 1,
            descripcion: "Tecnología"
          }
        }
      },
      {
        idCargo: 4,
        descripcion: "Analista de RRHH",
        area: {
          idArea: 7,
          descripcion: "Aplicaciones internas",
          departamento: {
            idDepartamento: 1,
            descripcion: "Tecnología"
          }
        }
      },
      {
        idCargo: 6,
        descripcion: "Asesor mesa de soporte Bogota",
        area: {
          idArea: 2,
          descripcion: "Soporte",
          departamento: {
            idDepartamento: 1,
            descripcion: "Tecnología"
          }
        }
      },
      {
        idCargo: 5,
        descripcion: "Contador",
        area: {
          idArea: 1,
          descripcion: "Desarrollo",
          departamento: {
            idDepartamento: 1,
            descripcion: "Tecnología"
          }
        }
      },
      {
        idCargo: 2,
        descripcion: "Desarrollador Senior",
        area: {
          idArea: 1,
          descripcion: "Desarrollo",
          departamento: {
            idDepartamento: 1,
            descripcion: "Tecnología"
          }
        }
      },
      {
        idCargo: 8,
        descripcion: "No lo se Rick",
        area: {
          idArea: 8,
          descripcion: "Seleccion",
          departamento: {
            idDepartamento: 2,
            descripcion: "Recursos Humanos"
          }
        }
      }
    ];

    this.buildHierarchicalStructureComplete();
    this.isDataLoaded = true;
    if (this.isEditMode && this.user) {
      this.loadFormData();
    }
  }

  private buildHierarchicalStructureComplete(): void {

    this.hierarchicalData = { departamentos: [] };

    const departamentosMap = new Map();
    this.departamentos.forEach(dept => {
      departamentosMap.set(dept.idDepartamento, {
        idDepartamento: dept.idDepartamento,
        descripcion: dept.descripcion,
        areas: [],
        expanded: false
      });
    });

    const areasMap = new Map();
    this.areas.forEach(area => {
      if (area.departamento && area.departamento.idDepartamento) {
        const areaKey = `${area.departamento.idDepartamento}-${area.idArea}`;
        const areaObj = {
          idArea: area.idArea,
          descripcion: area.descripcion,
          departamentoId: area.departamento.idDepartamento,
          cargos: [],
          expanded: false
        };
        areasMap.set(areaKey, areaObj);

        // Asignar área al departamento
        const departamento = departamentosMap.get(area.departamento.idDepartamento);
        if (departamento) {
          departamento.areas.push(areaObj);
        }
      }
    });

    this.cargosDisponibles.forEach(cargo => {
      if (cargo.area && cargo.area.departamento) {
        const areaKey = `${cargo.area.departamento.idDepartamento}-${cargo.area.idArea}`;
        const areaObj = areasMap.get(areaKey);

        if (areaObj) {
          const cargoExists = areaObj.cargos.find((c: any) => c.idCargo === cargo.idCargo);
          if (!cargoExists) {
            areaObj.cargos.push({
              idCargo: cargo.idCargo,
              descripcion: cargo.descripcion
            });
          }
        }
      }
    });

    this.hierarchicalData.departamentos = Array.from(departamentosMap.values())
      .sort((a: any, b: any) => a.descripcion.localeCompare(b.descripcion));

    this.hierarchicalData.departamentos.forEach((dept: any) => {
      dept.areas.sort((a: any, b: any) => a.descripcion.localeCompare(b.descripcion));
      dept.areas.forEach((area: any) => {
        area.cargos.sort((a: any, b: any) => a.descripcion.localeCompare(b.descripcion));
      });
    });
  }

  toggleDropdown(): void {
    this.isDropdownOpen = !this.isDropdownOpen;
  }

  closeDropdown(): void {
    this.isDropdownOpen = false;
  }

  // Método para prevenir el cierre accidental del dropdown
  preventDropdownClose(event: Event): void {
    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();
  }

  toggleDepartment(departamento: any, event?: Event): void {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }

    departamento.expanded = !departamento.expanded;

    if (!departamento.expanded) {
      departamento.areas.forEach((area: any) => {
        area.expanded = false;
      });
    }
  }

  toggleArea(area: any, event?: Event): void {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }

    area.expanded = !area.expanded;
  }

  selectCargo(cargo: any, event?: Event): void {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }

    if (!cargo || !cargo.idCargo) {
      console.error('Cargo inválido:', cargo);
      return;
    }

    this.selectedCargoInfo = cargo;
    this.userForm.get('cargo')?.setValue(cargo.idCargo);
    this.closeDropdown();
  }

  get selectedCargoText(): string {
    if (this.selectedCargoInfo) {
      return this.selectedCargoInfo.descripcion;
    }
    return 'Selecciona un cargo';
  }

  closePasswordModal(): void {
    this.isPasswordModalVisible = false;
    this.pendingUserData = null;
  }

  handlePasswordValidationError(error: string): void {
  }

  handlePasswordValidation(password: string): void {
    console.log('=== DEBUG: handlePasswordValidation INICIADO ===');
    console.log('Password recibido:', password ? '***' : 'vacío');
    console.log('pendingUserData existe:', !!this.pendingUserData);
    
    if (!password.trim()) {
      alert('La contraseña no puede estar vacía');
      return;
    }

    if (!this.pendingUserData) {
      console.error('ERROR: pendingUserData es null en handlePasswordValidation');
      this.closePasswordModal();
      return;
    }

    this.isPasswordModalVisible = false;

    this.confirmModalMessage = this.isEditMode
      ? `¿Confirmas la actualización del usuario ${this.pendingUserData.nombres} ${this.pendingUserData.apellidos}?`
      : `¿Confirmas la creación del usuario ${this.pendingUserData.nombres} ${this.pendingUserData.apellidos}?`;
    
    console.log('Abriendo modal de confirmación...');
    this.confirmModalVisible = true;
  }

  onAceptarConfirmacion(): void {
    console.log('=== DEBUG: onAceptarConfirmacion INICIADO ===');
    
    this.confirmModalVisible = false;

    if (!this.pendingUserData) {
      console.error('ERROR: pendingUserData es null');
      return;
    }

    this.isLoading = true;
    
    const operacion = this.isEditMode
      ? this.userService.actualizarUsuario(this.pendingUserData)
      : this.userService.crearUsuario(this.pendingUserData);

    operacion
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          console.log('=== RESPUESTA EXITOSA ===');
          this.isLoading = false;

          // NO intentar cambiar el método 2FA aquí
          // Ese cambio se hace desde el botón específico en users.ts
          
          this.modalSuccessMessage = this.isEditMode
            ? 'Usuario actualizado correctamente'
            : 'Usuario creado correctamente';
          
          this.modalSuccessVisible = true;
          
          if (this.isEditMode) {
            this.userUpdated.emit(this.pendingUserData!);
          } else {
            this.userCreated.emit(this.pendingUserData!);
          }
          this.save.emit(this.pendingUserData!);
        },
        error: (error) => {
          console.error('=== ERROR EN SERVIDOR ===');
          this.isLoading = false;

          if (error.error && error.error.mensaje) {
            this.errorMessage = error.error.mensaje;
          } else if (error.error && typeof error.error === 'string') {
            this.errorMessage = error.error;
          } else if (error.message) {
            this.errorMessage = error.message;
          } else {
            this.errorMessage = 'Error inesperado al procesar la solicitud';
          }

          if (error.error && error.error.details && Array.isArray(error.error.details)) {
            this.errorMessage += ':\n• ' + error.error.details.join('\n• ');
          }

          this.pendingUserData = null;
          this.confirmModalVisible = false;
          this.isPasswordModalVisible = false;
        }
      });
  }

  onCancelarConfirmacion(): void {
    this.confirmModalVisible = false;
    this.pendingUserData = null;
  }

  cerrarModalSuccess(): void {
    this.modalSuccessVisible = false;
    this.pendingUserData = null;
    setTimeout(() => {
      this.onClose();
    }, 500);
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

  // Método helper para convertir perfil a rol
  private convertirPerfilARol(perfilSeleccionado: string): any {
    switch (perfilSeleccionado) {
      case 'administrador':
        return { idRol: 1, descripcion: 'ADMINISTRADOR' };
      case 'funcionarioCreador':
        return { idRol: 3, descripcion: 'AUDITOR' };
      case 'funcionarios':
      default:
        return { idRol: 2, descripcion: 'FUNCIONARIO' };
    }
  }

  onSave(): void {
    console.log('=== DEBUG: onSave INICIADO ===');
    console.log('isEditMode:', this.isEditMode);
    
    this.resetMessages();
    const identificacionControl = this.userForm.get('identificacion');
    const wasDisabled = identificacionControl?.disabled;
    if (wasDisabled) {
      identificacionControl?.enable();
    }

    if (this.userForm.invalid) {
      console.error('Formulario inválido:', this.userForm.errors);
      this.markFormGroupTouched();
      this.errorMessage = 'Por favor, corrige los errores en el formulario.';
      if (wasDisabled) {
        identificacionControl?.disable();
      }
      return;
    }

    const formValue = this.userForm.getRawValue();

    // CRÍTICO: Obtener el cargo completo con toda su estructura
    const cargoCompleto = this.getCargoConTodasLasRelaciones(formValue.cargo);
    
    if (!cargoCompleto) {
      this.errorMessage = 'Error: No se pudo obtener la información completa del cargo';
      return;
    }

    console.log('DEBUG: Cargo completo:', JSON.stringify(cargoCompleto, null, 2));

    // Convertir perfil a rol con estructura completa
    let rolCompleto: any;
    switch (formValue.perfil) {
      case 'administrador':
        rolCompleto = { idRol: 1, descripcion: 'ADMINISTRADOR' };
        break;
      case 'funcionarioCreador':
        rolCompleto = { idRol: 3, descripcion: 'AUDITOR' };
        break;
      case 'funcionarios':
      default:
        rolCompleto = { idRol: 2, descripcion: 'FUNCIONARIO' };
        break;
    }

    console.log('DEBUG: Rol completo:', rolCompleto);

    // Estado con estructura completa
    // Al crear: PENDIENTE (id: 1), Al editar: mantener el estado actual
    const estadoCompleto = this.isEditMode
      ? (this.user?.estado || { idEstado: 5, descripcion: 'ACTIVO' })
      : { idEstado: 1, descripcion: 'PENDIENTE' };

    this.pendingUserData = {
      identificacion: formValue.identificacion,
      nombres: formValue.nombres,
      apellidos: formValue.apellidos,
      usuario: formValue.usuario,
      cargo: cargoCompleto,  // Objeto completo con área y departamento
      estado: estadoCompleto,
      rol: rolCompleto,  // Objeto completo con idRol y descripcion
      correoEmpresarial: formValue.correoEmpresarial || '',
      correoPersonal: formValue.correoPersonal || '',
      telefono1: formValue.celular || '',
      telefono2: formValue.telefono || '',
      direccion: formValue.direccion || '',
      // Enviar dobleAutenticacion solo en modo creación
      // En modo edición, el cambio se hace con el botón "Cambiar método 2FA" en users.ts
      dobleAutenticacion: this.isEditMode ? this.user?.dobleAutenticacion : formValue.dobleAutenticacion,
      activo: this.isEditMode ? (this.user?.activo !== false) : true
    } as Usuario;

    // Agregar idUsuario solo en modo edición
    if (this.isEditMode) {
      const userId = this.user?.idUsuario || this.user?.noUsuario;
      if (userId) {
        this.pendingUserData.idUsuario = userId;
      }
    }

    console.log('DEBUG: pendingUserData completo:', JSON.stringify(this.pendingUserData, null, 2));

    if (wasDisabled) {
      identificacionControl?.disable();
    }

    this.mensajePasswordModal = this.isEditMode
      ? 'Ingrese su contraseña para guardar los cambios del usuario.'
      : 'Ingrese su contraseña para crear el nuevo usuario.';
    
    this.isPasswordModalVisible = true;
  }

  private getCargoConTodasLasRelaciones(cargoId: string | number): any | null {
    if (!cargoId) {
      console.error('cargoId es null o undefined');
      return null;
    }

    // Si selectedCargoInfo ya tiene toda la estructura, usarla
    if (this.selectedCargoInfo && this.selectedCargoInfo.idCargo) {
      // Buscar el cargo completo en cargosDisponibles para asegurar estructura completa
      const cargoConRelaciones = this.cargosDisponibles.find(
        c => c.idCargo === this.selectedCargoInfo!.idCargo
      );

      if (cargoConRelaciones && cargoConRelaciones.area) {
        return {
          idCargo: cargoConRelaciones.idCargo,
          descripcion: cargoConRelaciones.descripcion,
          area: {
            idArea: cargoConRelaciones.area.idArea,
            descripcion: cargoConRelaciones.area.descripcion,
            departamento: {
              idDepartamento: cargoConRelaciones.area.departamento.idDepartamento,
              descripcion: cargoConRelaciones.area.departamento.descripcion
            }
          }
        };
      }
    }

    // Buscar por ID numérico en cargosDisponibles
    const cargoIdNum = typeof cargoId === 'string' ? parseInt(cargoId, 10) : cargoId;
    const cargo = this.cargosDisponibles.find(c => c.idCargo === cargoIdNum);

    if (cargo && cargo.area && cargo.area.departamento) {
      return {
        idCargo: cargo.idCargo,
        descripcion: cargo.descripcion,
        area: {
          idArea: cargo.area.idArea,
          descripcion: cargo.area.descripcion,
          departamento: {
            idDepartamento: cargo.area.departamento.idDepartamento,
            descripcion: cargo.area.departamento.descripcion
          }
        }
      };
    }

    console.error('No se encontró cargo con estructura completa para ID:', cargoId);
    return null;
  }

  onClose(): void {
    this.resetMessages();
    this.resetForm();
    this.isLoading = false;
    this.selectedCargoInfo = null;
    this.isDropdownOpen = false;
    this.isPasswordModalVisible = false;
    this.confirmModalVisible = false;
    this.modalSuccessVisible = false;
    this.pendingUserData = null;
    this.close.emit();
  }

  private resetForm(): void {
    this.userForm.reset({
      dobleAutenticacion: 'GOOGLE_AUTH',
      perfil: 'funcionarios'
    });
    this.userForm.get('identificacion')?.enable();
    this.selectedCargoInfo = null;
    this.isDropdownOpen = false;
    this.isPasswordModalVisible = false;
    this.confirmModalVisible = false;
    this.modalSuccessVisible = false;
    this.pendingUserData = null;
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
        pattern: 'Ingresa un número de celular válido'
      },
      telefono: {
        pattern: 'Ingresa el indicativo + un número de teléfono válido'
      },
      direccion: {
        maxlength: 'La dirección no puede exceder 200 caracteres'
      },
      dobleAutenticacion: {
        required: 'La doble autenticación es requerida'
      },
      perfil: {
        required: 'Debe seleccionar un perfil'
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

  // Métodos de tracking para mejorar performance del *ngFor
  trackByDepartamento(index: number, item: any): any {
    return item?.idDepartamento || index;
  }

  trackByArea(index: number, item: any): any {
    return item?.idArea || index;
  }

  trackByCargo(index: number, item: any): any {
    return item?.idCargo || index;
  }

}
