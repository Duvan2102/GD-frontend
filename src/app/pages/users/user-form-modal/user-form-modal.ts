import { Component, Input, Output, EventEmitter, OnChanges, SimpleChanges, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Subject, takeUntil, debounceTime, distinctUntilChanged, forkJoin, switchMap } from 'rxjs';
import { Usuario } from '../../../interfaces/common.interfaces';
import { UserService } from '../../../services/user.service';
import { AuthService } from '../../../services/auth.service';
import { PositionService, Position } from '../../../services/positions.service';
import { DepartmentService, Department } from '../../../services/department.service';
import { AreaService, Area } from '../../../services/area.service';
import { PasswordModal } from '../password-modal/password-modal';
import { ConfirmModal } from '../confirm-modal/confirm-modal';
import { SuccessModal } from '../success-modal/success-modal';
import { phoneValidator } from '../../../utils/phone-validators';

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
  @Output() userRejected = new EventEmitter<Usuario>();
  @Output() navigateToUsers = new EventEmitter<void>();
  @Output() showAlert = new EventEmitter<{type: 'success' | 'danger' | 'info' | 'warning', title: string, message: string}>();

  userForm!: FormGroup;
  cargosDisponibles: Position[] = [];
  departamentos: Department[] = [];
  areas: Area[] = [];
  hierarchicalData: any = { departamentos: [] };
  isDropdownOpen = false;
  selectedCargoInfo: Position | null = null;
  isDataLoaded = false;
  
  isPasswordModalVisible = false;
  confirmModalVisible = false;
  modalSuccessVisible = false;

  mensajePasswordModal = '';
  confirmModalMessage = '';
  modalSuccessMessage = '';
  modalSuccessBtn = 'Aceptar';

  pendingUserData: Usuario | null = null;
  pendingPassword: string = '';
  pendingAction: 'save' | 'reject' = 'save';
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
      celular: ['', [Validators.required, phoneValidator()]],
      telefono: ['', [phoneValidator()]],
      direccion: ['', [Validators.maxLength(200)]],
      // dobleAutenticacion eliminado
      vistaUsuarios: [false],
      vistaAuditor: [false],
      vistaAdministracion: [false]
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
        } else if (typeof this.user.cargo === 'object' && this.user.cargo.descripcion) {
          const cargoEncontrado = this.cargosDisponibles.find(
            c => c.descripcion === this.user?.cargo?.descripcion
          );
          cargoValue = (cargoEncontrado && cargoEncontrado.idCargo)
            ? cargoEncontrado.idCargo.toString()
            : '';
        }
      }
      
      if (!cargoValue) {
        this.selectedCargoInfo = null;
      }

      let tieneVistaUsuarios = false;
      let tieneVistaAuditor = false;
      let tieneVistaAdministracion = false;

      if (Array.isArray(this.user.rol)) {
        tieneVistaUsuarios = this.user.rol.includes(1);
        tieneVistaAuditor = this.user.rol.includes(2);
        tieneVistaAdministracion = this.user.rol.includes(3);
      } else if (this.user.rol && typeof this.user.rol === 'object' && 'idRol' in this.user.rol) {
        const rolId = (this.user.rol as any).idRol;
        tieneVistaUsuarios = rolId === 1;
        tieneVistaAuditor = rolId === 3;
        tieneVistaAdministracion = rolId === 1;
      } else {
        tieneVistaUsuarios = (this.user as any).vistaUsuarios ?? false;
        tieneVistaAuditor = (this.user as any).vistaAuditor ?? false;
        tieneVistaAdministracion = (this.user as any).vistaAdministracion ?? false;
      }

      this.userForm.patchValue({
        noUsuario: this.user.idUsuario || this.user.noUsuario || 0,
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
        vistaUsuarios: tieneVistaUsuarios,
        vistaAuditor: tieneVistaAuditor,
        vistaAdministracion: tieneVistaAdministracion
      });

      if (cargoValue) {
        this.setSelectedCargoFromValue(cargoValue);
      } else {
        this.selectedCargoInfo = null;
      }
      
      this.userForm.get('identificacion')?.disable();
      this.userForm.get('usuario')?.disable();
    } else {
      this.userForm.get('identificacion')?.enable();
      this.userForm.get('usuario')?.enable();
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
    return this.isEditMode ? 'Sin cargo asignado' : 'Selecciona un cargo';
  }

  closePasswordModal(): void {
    this.isPasswordModalVisible = false;
    this.pendingUserData = null;
    this.pendingPassword = '';
  }

  handlePasswordValidationError(error: string): void {
  }

  handlePasswordValidation(password: string): void {
    if (!password.trim()) {
      alert('La contraseña no puede estar vacía');
      return;
    }

    if (!this.pendingUserData && this.pendingAction !== 'reject') {
      this.closePasswordModal();
      return;
    }

    this.pendingPassword = password;
    
    this.isPasswordModalVisible = false;

    if (this.pendingAction === 'reject') {
      this.confirmModalMessage = `¿Confirmas el rechazo del usuario ${this.user?.nombres} ${this.user?.apellidos}? El usuario quedará en estado INACTIVO.`;
    } else {
      this.confirmModalMessage = this.isEditMode
        ? `¿Confirmas la actualización del usuario ${this.pendingUserData!.nombres} ${this.pendingUserData!.apellidos}?`
        : `¿Confirmas la creación del usuario ${this.pendingUserData!.nombres} ${this.pendingUserData!.apellidos}?`;
    }
    
    this.confirmModalVisible = true;
  }

  onAceptarConfirmacion(): void {
    this.confirmModalVisible = false;

    // Manejar el rechazo de usuario
    if (this.pendingAction === 'reject') {
      this.ejecutarRechazoUsuario();
      return;
    }

    if (!this.pendingUserData) {
      return;
    }

    this.isLoading = true;
    
    const isPendingUser = this.user?.estado && 
      this.user.estado.descripcion && 
      this.user.estado.descripcion.toUpperCase() === 'PENDIENTE';
    
    if (this.isEditMode && isPendingUser) {      
      const datosParaActualizar = {
        ...this.pendingUserData,
        estado: this.user?.estado || { idEstado: 3, descripcion: 'PENDIENTE' }
      };
      
      console.log('🔄 Iniciando actualización de usuario pendiente:', {
        userId: this.user?.idUsuario || this.user?.noUsuario,
        datosParaActualizar: datosParaActualizar
      });
      
      this.userService.actualizarUsuario(datosParaActualizar)
        .pipe(
          takeUntil(this.destroy$),
          switchMap((updateResponse) => {
            console.log('✅ Usuario actualizado exitosamente:', updateResponse);
            
            // Validar que tenemos el ID del usuario para la activación
            const userId = this.user?.idUsuario || this.user?.noUsuario;
            if (!userId) {
              console.error('❌ Error: ID de usuario no disponible para activación');
              throw new Error('Error: ID de usuario no disponible para activación');
            }
            
            console.log('🔄 Iniciando activación de usuario con ID:', userId);
            
            const usuarioParaActivar: Usuario = {
              idUsuario: userId,
              identificacion: this.user?.identificacion || '',
              nombres: this.user?.nombres || '',
              apellidos: this.user?.apellidos || '',
              usuario: this.user?.usuario || '',
              correoEmpresarial: this.user?.correoEmpresarial || '',
              telefono1: this.user?.telefono1 || '',
              telefono2: this.user?.telefono2 || '',
              direccion: this.user?.direccion || '',
              cargo: this.user?.cargo,
              rol: this.user?.rol,
              estado: this.user?.estado,
              activo: true
            } as Usuario;
            
            console.log('📤 Enviando usuario para activación:', usuarioParaActivar);
            return this.userService.activarUsuario(usuarioParaActivar, this.pendingPassword);
          })
        )
        .subscribe({
          next: (activationResponse) => {
            this.isLoading = false;
            
            this.showAlert.emit({
              type: 'success',
              title: '¡Éxito!',
              message: 'Usuario actualizado y activado correctamente'
            });
            
            const usuarioActualizado = {
              ...this.pendingUserData,
              idUsuario: this.user?.idUsuario || this.user?.noUsuario || this.pendingUserData?.idUsuario || 0,
              estado: { idEstado: 1, descripcion: 'ACTIVO' }
            } as Usuario;
            
            this.userUpdated.emit(usuarioActualizado);
            this.save.emit(usuarioActualizado);
            
            this.pendingPassword = '';
            
            setTimeout(() => {
              this.onClose();
            }, 500);
          },
          error: (error) => {
            this.isLoading = false;

            let errorMsg = '';
            if (error.error && error.error.mensaje) {
              errorMsg = error.error.mensaje;
            } else if (error.error && typeof error.error === 'string') {
              errorMsg = error.error;
            } else if (error.message) {
              errorMsg = error.message;
            } else {
              errorMsg = 'Error inesperado al procesar la solicitud';
            }

            if (error.error && error.error.details && Array.isArray(error.error.details)) {
              errorMsg += ':\n• ' + error.error.details.join('\n• ');
            }

            this.showAlert.emit({
              type: 'danger',
              title: 'Error',
              message: errorMsg
            });

            this.pendingUserData = null;
            this.pendingPassword = '';
            this.confirmModalVisible = false;
            this.isPasswordModalVisible = false;
          }
        });
    } else {
      const operacion = this.isEditMode
        ? this.userService.actualizarUsuario(this.pendingUserData)
        : this.userService.crearUsuario(this.pendingUserData);

      operacion
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (response) => {
            this.isLoading = false;
            
            const message = this.isEditMode
              ? 'Usuario actualizado correctamente'
              : 'Usuario creado correctamente';
            
            this.showAlert.emit({
              type: 'success',
              title: '¡Éxito!',
              message: message
            });
            
            if (this.isEditMode) {
              this.userUpdated.emit(this.pendingUserData!);
            } else {
              this.userCreated.emit(this.pendingUserData!);
            }
            this.save.emit(this.pendingUserData!);
            
            this.pendingPassword = '';
            
            setTimeout(() => {
              this.onClose();
            }, 500);
          },
        error: (error) => {
          this.isLoading = false;

          let errorMsg = '';
          if (error.error && error.error.mensaje) {
            errorMsg = error.error.mensaje;
          } else if (error.error && typeof error.error === 'string') {
            errorMsg = error.error;
          } else if (error.message) {
            errorMsg = error.message;
          } else {
            errorMsg = 'Error inesperado al procesar la solicitud';
          }

          if (error.error && error.error.details && Array.isArray(error.error.details)) {
            errorMsg += ':\n• ' + error.error.details.join('\n• ');
          }

          this.showAlert.emit({
            type: 'danger',
            title: 'Error',
            message: errorMsg
          });

          this.pendingUserData = null;
          this.pendingPassword = '';
          this.confirmModalVisible = false;
          this.isPasswordModalVisible = false;
        }
      });
    }
  }

  onCancelarConfirmacion(): void {
    this.confirmModalVisible = false;
    this.pendingUserData = null;
    this.pendingPassword = '';
    this.pendingAction = 'save';
  }

  onRechazar(): void {
    this.resetMessages();
    this.pendingAction = 'reject';
    this.mensajePasswordModal = 'Ingrese su contraseña para rechazar la solicitud. El usuario quedará INACTIVO.';
    this.isPasswordModalVisible = true;
  }

  private ejecutarRechazoUsuario(): void {
    if (!this.user || !this.pendingPassword) {
      this.showAlert.emit({
        type: 'danger',
        title: 'Error',
        message: 'No se pudo procesar el rechazo. Datos insuficientes.'
      });
      return;
    }

    this.isLoading = true;

    this.userService.desactivarUsuario(this.user, this.pendingPassword)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.isLoading = false;
          
          this.showAlert.emit({
            type: 'success',
            title: '¡Éxito!',
            message: 'Solicitud de usuario rechazada. El usuario ha sido marcado como INACTIVO.'
          });
          
          this.userRejected.emit(this.user!);
          
          this.pendingPassword = '';
          this.pendingAction = 'save';
          
          setTimeout(() => {
            this.onClose();
          }, 500);
        },
        error: (error) => {
          this.isLoading = false;

          let errorMsg = '';
          if (error.error && error.error.mensaje) {
            errorMsg = error.error.mensaje;
          } else if (error.error && typeof error.error === 'string') {
            errorMsg = error.error;
          } else if (error.message) {
            errorMsg = error.message;
          } else {
            errorMsg = 'Error inesperado al rechazar la solicitud';
          }

          if (error.error && error.error.details && Array.isArray(error.error.details)) {
            errorMsg += ':\n• ' + error.error.details.join('\n• ');
          }

          this.showAlert.emit({
            type: 'danger',
            title: 'Error',
            message: errorMsg
          });

          this.pendingPassword = '';
          this.pendingAction = 'save';
          this.confirmModalVisible = false;
          this.isPasswordModalVisible = false;
        }
      });
  }

  cerrarModalSuccess(): void {
    this.modalSuccessVisible = false;
    this.pendingUserData = null;
    
    if (!this.isEditMode) {
      this.navigateToUsers.emit();
    }
    
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


  onSave(): void {
    this.resetMessages();
    const identificacionControl = this.userForm.get('identificacion');
    const usuarioControl = this.userForm.get('usuario');
    const wasIdentificacionDisabled = identificacionControl?.disabled;
    const wasUsuarioDisabled = usuarioControl?.disabled;
    
    if (wasIdentificacionDisabled) {
      identificacionControl?.enable();
    }
    if (wasUsuarioDisabled) {
      usuarioControl?.enable();
    }

    if (this.userForm.invalid) {
      console.error('Formulario inválido:', this.userForm.errors);
      this.markFormGroupTouched();
      
      this.showAlert.emit({
        type: 'warning',
        title: 'Formulario incompleto',
        message: 'Por favor, corrige los errores en el formulario antes de continuar.'
      });
      
      if (wasIdentificacionDisabled) {
        identificacionControl?.disable();
      }
      if (wasUsuarioDisabled) {
        usuarioControl?.disable();
      }
      return;
    }

    const formValue = this.userForm.getRawValue();

    let cargoCompleto = null;
    if (formValue.cargo) {
      cargoCompleto = this.getCargoConTodasLasRelaciones(formValue.cargo);
      
      if (!cargoCompleto) {
        this.showAlert.emit({
          type: 'danger',
          title: 'Error',
          message: 'No se pudo obtener la información completa del cargo seleccionado'
        });
        return;
      }
    } else if (!this.isEditMode) {
      this.showAlert.emit({
        type: 'warning',
        title: 'Campo requerido',
        message: 'Debe seleccionar un cargo para el usuario'
      });
      return;
    }

    const rolesArray: number[] = [0];
    
    if (formValue.vistaUsuarios) {
      rolesArray.push(1);
    }
    if (formValue.vistaAuditor) {
      rolesArray.push(2);
    }
    if (formValue.vistaAdministracion) {
      rolesArray.push(3);
    }
    
    const rolCompleto = rolesArray;

    const isPendingUser = this.isEditMode && this.user?.estado && 
      this.user.estado.descripcion && 
      this.user.estado.descripcion.toUpperCase() === 'PENDIENTE';
    
    const estadoCompleto = this.isEditMode
      ? (isPendingUser ? { idEstado: 5, descripcion: 'ACTIVO' } : (this.user?.estado || { idEstado: 5, descripcion: 'ACTIVO' }))
      : { idEstado: 5, descripcion: 'ACTIVO' };

    const userIdForOperation = this.isEditMode 
      ? (this.user?.idUsuario || this.user?.noUsuario) 
      : undefined;

    this.pendingUserData = {
      idUsuario: userIdForOperation,
      identificacion: formValue.identificacion,
      nombres: formValue.nombres,
      apellidos: formValue.apellidos,
      usuario: formValue.usuario,
      cargo: cargoCompleto,
      estado: estadoCompleto,
      rol: rolCompleto,
      correoEmpresarial: formValue.correoEmpresarial || '',
      correoPersonal: formValue.correoPersonal || '',
      telefono1: formValue.celular || '',
      telefono2: formValue.telefono || '',
      direccion: formValue.direccion || '',
      activo: true,
      vistaUsuarios: formValue.vistaUsuarios || false,
      vistaAuditor: formValue.vistaAuditor || false,
      vistaAdministracion: formValue.vistaAdministracion || false
    } as unknown as Usuario & { vistaUsuarios: boolean; vistaAuditor: boolean; vistaAdministracion: boolean };

    if (wasIdentificacionDisabled) {
      identificacionControl?.disable();
    }
    if (wasUsuarioDisabled) {
      usuarioControl?.disable();
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

    if (this.selectedCargoInfo && this.selectedCargoInfo.idCargo) {
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
    this.pendingPassword = '';
    this.pendingAction = 'save';
    this.close.emit();
  }

  private resetForm(): void {
    this.userForm.reset({
    });
    this.userForm.get('identificacion')?.enable();
    this.userForm.get('usuario')?.enable();
    this.selectedCargoInfo = null;
    this.isDropdownOpen = false;
    this.isPasswordModalVisible = false;
    this.confirmModalVisible = false;
    this.modalSuccessVisible = false;
    this.pendingUserData = null;
    this.pendingPassword = '';
    this.pendingAction = 'save';
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

  get isPendingUser(): boolean {
    return !!(this.isEditMode && this.user?.estado && 
      this.user.estado.descripcion && 
      this.user.estado.descripcion.toUpperCase() === 'PENDIENTE');
  }

  hasError(controlName: string, errorType: string): boolean {
    const control = this.userForm.get(controlName);
    return !!(control && control.hasError(errorType) && (control.dirty || control.touched));
  }

  getErrorMessage(controlName: string): string {
    const control = this.userForm.get(controlName);
    if (!control?.errors) return '';
    
    if (!control.touched && !control.dirty) return '';

    const errors = control.errors;
    
    if (controlName === 'celular' || controlName === 'telefono') {
      const field = controlName === 'celular' ? 'celular' : 'teléfono';
      
      if (errors['required']) {
        return `El ${field} es requerido`;
      }
      if (errors['phoneLength']) {
        return `El ${field} debe tener exactamente 10 dígitos`;
      }
      if (errors['phoneAllSame']) {
        return `El ${field} no puede tener todos los dígitos iguales`;
      }
      if (errors['phoneConsecutive']) {
        return `El ${field} no puede tener más de 3 dígitos consecutivos iguales`;
      }
      if (errors['phoneInvalid']) {
        return `El ${field} solo debe contener números`;
      }
    }
    
    const errorMessages: { [key: string]: { [key: string]: string } } = {
      identificacion: {
        required: 'La identificación es requerida',
        pattern: 'Ingresa un número de identificación válido (6-12 dígitos)'
      },
      direccion: {
        maxlength: 'La dirección no puede exceder 200 caracteres'
      },
      perfil: {
        required: 'Debe seleccionar un perfil'
      },
      cargo: {
        required: 'Debe seleccionar un cargo'
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
      correoEmpresarial: {
        required: 'El correo empresarial es requerido',
        email: 'Ingrese un correo electrónico válido'
      },
      correoPersonal: {
        email: 'Ingrese un correo electrónico válido'
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
