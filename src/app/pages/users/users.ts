import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject, takeUntil } from 'rxjs';
import { Controls } from '../approvals/controls/controls';
import { FooterControls } from '../approvals/footer-controls/footer-controls';
import { UserFormModal } from './user-form-modal/user-form-modal';
import { PasswordModal } from './password-modal/password-modal';
import { SuccessModal } from './success-modal/success-modal';
import { ConfirmModal } from './confirm-modal/confirm-modal';
import { ChangePassword } from './change-password/change-password';
import { UserFormRegister } from '../../components/user-form-register/user-form-register';
import { UserService } from '../../services/user.service';
import { AuthService } from '../../services/auth.service';
import { UserStateService } from '../../services/user-state.service';
import { Usuario } from '../../interfaces/common.interfaces';

@Component({
  selector: 'app-usuarios',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    Controls,
    FooterControls,
    UserFormModal,
    PasswordModal,
    SuccessModal,
    ConfirmModal,
    ChangePassword,
    UserFormRegister
  ],
  templateUrl: './users.html',
  styleUrls: ['./users.css']
})
export class Users implements OnInit, OnDestroy {
  usuarios: Usuario[] = [];
  usuariosFiltrados: Usuario[] = [];
  usuariosFiltradosLength = 0;
  searchTerm = '';
  activos = true;
  itemsPerPage = 10;
  paginaActual = 1;
  filaDesplegada: number | null = null;
  currentOrder: string = '';
  ascendingOrder: boolean = true;
  isUserFormVisible = false;
  isRegisterUserModalVisible = false;
  isPasswordModalVisible = false;
  isChangePasswordModalVisible = false;
  isChange2FAMethodModalVisible = false;
  selected2FAMethod: 'GOOGLE_AUTH' | 'EMAIL' = 'GOOGLE_AUTH';
  currentUser: Usuario | null = null;
  currentAction = '';
  mensajePasswordModal: string = '';

  isLoading = false;
  private isProcessing2FAChange = false;
  private last2FAChangeTime = 0;
  errorMessage = '';
  private destroy$ = new Subject<void>();
  modalSuccessVisible: boolean = false;
  modalSuccessMessage: string = '';
  modalSuccessBtn: string = 'Aceptar';
  modalIsConfirmation: boolean = false;
  passwordModalError: string = '';
  confirmModalVisible = false;
  confirmModalMessage = '';
  confirmModalAction: 'inactivar' | 'activar' | 'eliminarQR' | 'rechazar' | null = null;

  // Sistema de alertas externas
  externalAlerts: Array<{
    type: 'success' | 'danger' | 'info' | 'warning';
    title: string;
    message: string;
  }> = [];

  constructor(
    private userService: UserService,
    private authService: AuthService,
    private userStateService: UserStateService
  ) {}

  ngOnInit(): void {
    this.cargarUsuarios();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.userStateService.clearPendingOperation(); // Limpiar al destruir
  }

  cargarUsuarios(): void {
    this.isLoading = true;
    this.errorMessage = '';
    this.usuarios = [];
    
    this.userService.clearUsersCache();
    
    this.userService.obtenerUsuarios()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (usuarios) => {
          this.usuarios = usuarios;
          this.filtrarUsuarios();
          this.isLoading = false;
        },
        error: (error) => {
          console.error('Error cargando usuarios:', error);
          this.errorMessage = 'No se pudo conectar con el servidor. Verifique la conexión.';
          this.isLoading = false;
          this.usuarios = [];
          this.filtrarUsuarios();
        }
      });
  }
  mostrarModalConfirmation(mensaje: string, textoBtn: string = 'Aceptar') {
    this.modalSuccessMessage = mensaje;
    this.modalSuccessBtn = textoBtn;
    this.modalSuccessVisible = true;
    this.modalIsConfirmation = true;
  }

  mostrarModalSuccess(mensaje: string, textoBtn: string = 'Aceptar') {
    this.modalSuccessMessage = mensaje;
    this.modalSuccessBtn = textoBtn;
    this.modalSuccessVisible = true;
    this.modalIsConfirmation = false;
  }

  cerrarModalSuccess() {
    this.modalSuccessVisible = false;
    
    if (
      this.modalIsConfirmation &&
      (this.currentAction === 'inactivar' || this.currentAction === 'eliminarQR')
    ) {
      this.isPasswordModalVisible = true;
      this.mensajePasswordModal =
        this.currentAction === 'inactivar'
          ? 'Ingrese su contraseña para inactivar el usuario.'
          : 'Ingrese su contraseña para eliminar el código QR del usuario.';
    } else {
      this.currentUser = null;
      this.currentAction = '';
    }
  }

  filtrarUsuarios() {
    let filtrados = this.usuarios.filter(u => {
      if (this.activos) {
        const estadoDescripcion = typeof u.estado === 'object'
          ? (u.estado.descripcion || '').toString().trim().toUpperCase()
          : String(u.estado || '').trim().toUpperCase();

        return estadoDescripcion === 'ACTIVO' || estadoDescripcion === 'PENDIENTE';
      } else {
        const estadoDescripcion = typeof u.estado === 'object'
          ? (u.estado.descripcion || '').toString().trim().toUpperCase()
          : String(u.estado || '').trim().toUpperCase();

        return estadoDescripcion === 'INACTIVO';
      }
    });

    if (this.searchTerm.trim()) {
      const t = this.searchTerm.trim().toLowerCase();
      filtrados = filtrados.filter(u =>
        u.nombres.toLowerCase().includes(t) ||
        u.apellidos.toLowerCase().includes(t) ||
        u.usuario.toLowerCase().includes(t) ||
        u.identificacion.toLowerCase().includes(t)
      );
    }

    if (this.currentOrder) {
      filtrados = this.sortUsuarios(filtrados, this.currentOrder, this.ascendingOrder);
    }

    this.usuariosFiltradosLength = filtrados.length;
    const start = (this.paginaActual - 1) * this.itemsPerPage;
    this.usuariosFiltrados = filtrados.slice(start, start + this.itemsPerPage);
    this.filaDesplegada = null;
  }

  onBuscar(valor: string) {
    this.searchTerm = valor;
    this.paginaActual = 1;
    this.filtrarUsuarios();
  }

  onToggleActivos(checked: boolean) {
    this.activos = !checked;
    this.paginaActual = 1;
    this.filtrarUsuarios();
  }

  onChangeCantidad(cantidad: number) {
    this.itemsPerPage = +cantidad;
    this.paginaActual = 1;
    this.filtrarUsuarios();
  }

  onChangePage(page: number) {
    this.paginaActual = page;
    this.filtrarUsuarios();
  }

  toggleDesplegable(i: number) {
    this.filaDesplegada = this.filaDesplegada === i ? null : i;
  }

  accion(tipo: string, u: Usuario, e: Event) {
    e.preventDefault();
    this.currentUser = { ...u };
    this.currentAction = tipo;

    switch (tipo) {
      case 'editar':
        this.isUserFormVisible = true;
        break;

      case 'inactivar':
        this.mostrarModalConfirmation(
          `¿Está seguro de inactivar al usuario ${u.nombres} ${u.apellidos}?`,
          'Sí, inactivar'
        );
        break;

      case 'cambiarContraseña':
        this.mensajePasswordModal = 'Ingrese su contraseña para cambiar la contraseña del usuario.';
        this.passwordModalError = '';
        this.isPasswordModalVisible = true;
        break;

      case 'cambiar2FA':
        this.abrirModal2FA(u);
        break;

      case 'eliminarQR':
        this.mensajePasswordModal = 'Ingrese su contraseña para eliminar el código QR del usuario.';
        this.passwordModalError = '';
        this.isPasswordModalVisible = true;
        break;

      default:
    }
  }

  abrirModal2FA(usuario: Usuario): void {
    const timeSinceLastChange = Date.now() - this.last2FAChangeTime;
    if (this.last2FAChangeTime > 0 && timeSinceLastChange < 2000) {
      return;
    }
    
    this.currentUser = { ...usuario };
    this.currentAction = 'cambiar2FA';
    
    const dobleAuth = usuario.dobleAutenticacion;
    
    if (dobleAuth === 'GOOGLE_AUTH') {
      this.selected2FAMethod = 'GOOGLE_AUTH';
    } else if (dobleAuth === 'EMAIL') {
      this.selected2FAMethod = 'EMAIL';
    } else if (typeof dobleAuth === 'boolean') {
      this.selected2FAMethod = dobleAuth ? 'EMAIL' : 'GOOGLE_AUTH';
    } else {
      this.selected2FAMethod = 'GOOGLE_AUTH';
    }
    
    this.isChange2FAMethodModalVisible = true;
  }

  closeChange2FAMethodModal(): void {
    this.isChange2FAMethodModalVisible = false;
    this.currentUser = null;
    this.currentAction = '';
    this.isLoading = false;
    this.isProcessing2FAChange = false;
  }

  on2FAMethodChange(): void {
    if (this.isProcessing2FAChange || this.isLoading) {
      return;
    }
    
    if (!this.currentUser || !this.currentUser.idUsuario) {
      this.mostrarModalSuccess('Error: No se encontró la información del usuario', 'Entendido');
      this.closeChange2FAMethodModal();
      return;
    }

    if (!this.selected2FAMethod) {
      this.mostrarModalSuccess('Por favor selecciona un método de autenticación', 'Entendido');
      return;
    }

    const dobleAuth = this.currentUser.dobleAutenticacion;
    let metodoActual: 'GOOGLE_AUTH' | 'EMAIL' = 'GOOGLE_AUTH';
    
    if (dobleAuth === 'GOOGLE_AUTH') {
      metodoActual = 'GOOGLE_AUTH';
    } else if (dobleAuth === 'EMAIL') {
      metodoActual = 'EMAIL';
    } else if (typeof dobleAuth === 'boolean') {
      metodoActual = dobleAuth ? 'EMAIL' : 'GOOGLE_AUTH';
    } else if (dobleAuth === null || dobleAuth === undefined) {
      metodoActual = 'GOOGLE_AUTH';
    }

    if (metodoActual === this.selected2FAMethod) {
      this.mostrarModalSuccess(
        `El usuario ya tiene configurado el método ${this.selected2FAMethod === 'GOOGLE_AUTH' ? 'Google Authenticator' : 'Correo Electrónico'}. No es necesario cambiarlo.`,
        'Entendido'
      );
      this.closeChange2FAMethodModal();
      return;
    }

    this.isLoading = true;
    this.isProcessing2FAChange = true;
    
    this.authService.change2FAMethod(this.currentUser.idUsuario, this.selected2FAMethod)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response: any) => {
          let mensaje = response.message || 'Método de autenticación cambiado correctamente';
          if (response.qrCodeUrl) {
            mensaje += '\n\nSe ha generado un nuevo código QR. El usuario deberá escanearlo en su próximo login.';
          }
          
          if (this.selected2FAMethod === 'EMAIL') {
            mensaje += '\n\nEl usuario recibirá códigos de verificación por email en el próximo inicio de sesión.';
          }
          
          this.isLoading = false;
          this.isProcessing2FAChange = false;
          this.last2FAChangeTime = Date.now();
          
          this.closeChange2FAMethodModal();
          this.mostrarModalSuccess(mensaje, 'Aceptar');
          
          this.userService.clearUsersCache();
          setTimeout(() => this.cargarUsuarios(), 500);
        },
        error: (error: any) => {
          let mensajeError = 'Error al cambiar el método de autenticación';
          
          if (error.status === 0) {
            mensajeError = 'Error de conexión con el servidor. Verifica tu conexión a internet.';
          } else if (error.status === 401) {
            mensajeError = 'Sesión expirada. Por favor, inicia sesión nuevamente.';
          } else if (error.status === 403) {
            mensajeError = 'No tienes permisos para cambiar el método de autenticación.';
          } else if (error.status === 404) {
            mensajeError = 'Usuario no encontrado o endpoint no disponible.';
          } else if (error.userMessage) {
            mensajeError = error.userMessage;
          } else if (error.error?.message) {
            mensajeError = error.error.message;
          } else if (error.message) {
            mensajeError = error.message;
          }
          
          this.isLoading = false;
          this.isProcessing2FAChange = false;
          
          this.closeChange2FAMethodModal();
          this.mostrarModalSuccess(mensajeError, 'Entendido');
        }
      });
  }

  openCreateUserModal(): void {
    this.currentUser = null;
    this.currentAction = 'crear';
    this.mensajePasswordModal = 'Por favor ingrese su contraseña para crear el usuario.';
    this.isUserFormVisible = true;
  }

  openRegisterUserModal(): void {
    this.isRegisterUserModalVisible = true;
  }

  closeRegisterUserModal(): void {
    this.isRegisterUserModalVisible = false;
  }

  handleUserRegistered(event: { idUsuario: number }): void {
    this.closeRegisterUserModal();
    
    this.modalSuccessMessage = `Usuario registrado exitosamente con ID: ${event.idUsuario}. Debe ser activado por un administrador.`;
    this.modalSuccessBtn = 'Aceptar';
    this.modalSuccessVisible = true;
    
    this.cargarUsuarios();
  }

  openEditUserModal(user: Usuario): void {
    this.currentAction = 'editar';
    this.currentUser = { ...user };
    this.mensajePasswordModal = 'Ingrese su contraseña para guardar los cambios.';
    this.isUserFormVisible = true;
  }

  closeUserFormModal(): void {
    this.isUserFormVisible = false;
  }

  saveUser(userData: Usuario): void {
    this.userService.clearUsersCache();
    this.cargarUsuarios();
    this.isUserFormVisible = false;
    this.currentUser = null;
    this.currentAction = '';
  }

  handleUserRejected(user: Usuario): void {
    this.userService.clearUsersCache();
    this.cargarUsuarios();
    this.isUserFormVisible = false;
    this.currentUser = null;
    this.currentAction = '';
  }

  handleNavigateToUsers(): void {
    this.userService.clearUsersCache();
    this.cargarUsuarios();
    this.isUserFormVisible = false;
    this.currentUser = null;
    this.currentAction = '';
  }

  closePasswordModal(): void {
    this.isPasswordModalVisible = false;
    this.passwordModalError = '';
    this.currentUser = null;
    this.currentAction = '';
  }

  handlePasswordValidation(password: string): void {
    this.passwordModalError = '';
    
    if (!this.currentUser) {
      const pending = this.userStateService.getPendingOperation();
      this.currentUser = pending.user;
      this.currentAction = pending.action as any;
    }
    
    if (!this.currentUser) {
      alert('Error: No se encontró la información del usuario. Por favor, intente de nuevo.');
      this.isPasswordModalVisible = false;
      this.userStateService.clearPendingOperation();
      return;
    }

    if (this.currentAction === 'eliminarQR') {
      if (this.currentUser && this.currentUser.usuario) {
        this.authService.removeUserQR(this.currentUser.usuario, password)
          .pipe(takeUntil(this.destroy$))
          .subscribe({
            next: (response: any) => {
              this.mostrarModalSuccess('Código QR eliminado con éxito', 'Aceptar');
              this.userService.clearUsersCache();
              this.cargarUsuarios();
              this.isPasswordModalVisible = false;
              this.userStateService.clearPendingOperation();
              this.currentUser = null;
              this.currentAction = '';
            },
            error: (error: any) => {
              let mensajeError = 'Error al eliminar el código QR';
              let esErrorPassword = false;
              
              if (error.status === 401 || error.error?.code === 'PASSWORD_INCORRECT') {
                mensajeError = 'Contraseña incorrecta';
                esErrorPassword = true;
              } else if (error.status === 404 || error.error?.code === 'USUARIO_NO_ENCONTRADO') {
                mensajeError = 'Usuario no encontrado.';
              } else if (error.error?.code === 'QR_NO_CONFIGURADO') {
                mensajeError = 'El usuario no tiene un código QR configurado.';
              } else if (error.error?.message) {
                mensajeError = error.error.message;
              } else if (error.message) {
                mensajeError = error.message;
              }
              
              if (esErrorPassword) {
                this.passwordModalError = mensajeError;
              } else {
                this.isPasswordModalVisible = false;
                this.mostrarModalSuccess(mensajeError, 'Entendido');
                this.userStateService.clearPendingOperation();
                this.currentUser = null;
                this.currentAction = '';
              }
            }
          });
      }
    } else {
      this.confirmAction(password);
    }
  }

  handlePasswordValidationError(error: string): void {}

  confirmAction(password: string): void {
    this.passwordModalError = '';
    
    if (!password.trim()) {
      return alert('La contraseña no puede estar vacía');
    }

    if (!this.currentUser) {
      const pending = this.userStateService.getPendingOperation();
      this.currentUser = pending.user;
      this.currentAction = pending.action as any;
    }

    if (!this.currentUser) {
      alert('Error: No se encontró la información del usuario. Por favor, intente de nuevo.');
      this.isPasswordModalVisible = false;
      this.userStateService.clearPendingOperation();
      return;
    }

    switch (this.currentAction) {
      case 'crear':
        if (this.currentUser) {
          this.userService.crearUsuario(this.currentUser)
            .pipe(takeUntil(this.destroy$))
            .subscribe({
              next: (response: any) => {
                this.mostrarModalSuccess('Usuario creado con éxito', 'Aceptar');
                this.cargarUsuarios();
                this.isPasswordModalVisible = false;
                this.userStateService.clearPendingOperation();
              },
              error: (error: any) => {
                alert('Error al crear el usuario: ' + (error.message || 'Error desconocido'));
                this.isPasswordModalVisible = false;
                this.userStateService.clearPendingOperation();
              }
            });
        }
        break;

      case 'editar':
        if (this.currentUser) {
          this.userService.actualizarUsuario(this.currentUser)
            .pipe(takeUntil(this.destroy$))
            .subscribe({
              next: (response: any) => {
                this.mostrarModalSuccess('Usuario editado con éxito', 'Aceptar');
                this.cargarUsuarios();
                this.isPasswordModalVisible = false;
                this.userStateService.clearPendingOperation();
              },
              error: (error: any) => {
                alert('Error al actualizar el usuario: ' + (error.message || 'Error desconocido'));
                this.isPasswordModalVisible = false;
                this.userStateService.clearPendingOperation();
              }
            });
        }
        break;

      case 'inactivar':
        if (this.currentUser) {
          this.userService.desactivarUsuario(this.currentUser, password)
            .pipe(takeUntil(this.destroy$))
            .subscribe({
              next: (response: any) => {
                this.mostrarModalSuccess('Usuario inactivado con éxito', 'Aceptar');
                this.userService.clearUsersCache();
                this.cargarUsuarios();
                this.isPasswordModalVisible = false;
                this.userStateService.clearPendingOperation();
                this.currentUser = null;
                this.currentAction = '';
              },
              error: (error: any) => {
                let mensajeError = 'Error al inactivar el usuario';
                let esErrorPassword = false;
                
                if (error.status === 401 || error.error?.code === 'PASSWORD_INCORRECT') {
                  mensajeError = 'Contraseña incorrecta';
                  esErrorPassword = true;
                } else if (error.error?.message) {
                  mensajeError = error.error.message;
                } else if (error.message) {
                  mensajeError = error.message;
                }
                
                if (esErrorPassword) {
                  this.passwordModalError = mensajeError;
                } else {
                  this.isPasswordModalVisible = false;
                  this.mostrarModalSuccess(mensajeError, 'Entendido');
                  this.userStateService.clearPendingOperation();
                  this.currentUser = null;
                  this.currentAction = '';
                }
              }
            });
        }
        break;

      case 'activar':
        if (this.currentUser) {
          this.userService.activarUsuario(this.currentUser, password)
            .pipe(takeUntil(this.destroy$))
            .subscribe({
              next: (response: any) => {
                this.mostrarModalSuccess('Usuario activado con éxito', 'Aceptar');
                this.userService.clearUsersCache();
                this.cargarUsuarios();
                this.isPasswordModalVisible = false;
                this.userStateService.clearPendingOperation();
                this.currentUser = null;
                this.currentAction = '';
              },
              error: (error: any) => {
                let mensajeError = 'Error al activar el usuario';
                let esErrorPassword = false;
                
                if (error.status === 401 || error.error?.code === 'PASSWORD_INCORRECT') {
                  mensajeError = 'Contraseña incorrecta';
                  esErrorPassword = true;
                } else if (error.error?.message) {
                  mensajeError = error.error.message;
                } else if (error.message) {
                  mensajeError = error.message;
                }
                
                if (esErrorPassword) {
                  this.passwordModalError = mensajeError;
                } else {
                  this.isPasswordModalVisible = false;
                  this.mostrarModalSuccess(mensajeError, 'Entendido');
                  this.userStateService.clearPendingOperation();
                  this.currentUser = null;
                  this.currentAction = '';
                }
              }
            });
        }
        break;

      case 'cambiarContraseña':
        this.isPasswordModalVisible = false;
        this.isChangePasswordModalVisible = true;
        break;

      case 'rechazar':
        if (this.currentUser) {
          this.userService.desactivarUsuario(this.currentUser, password)
            .pipe(takeUntil(this.destroy$))
            .subscribe({
              next: (response: any) => {
                this.mostrarModalSuccess('Solicitud de usuario rechazada. El usuario ha sido marcado como INACTIVO.', 'Aceptar');
                this.userService.clearUsersCache();
                this.cargarUsuarios();
                this.isPasswordModalVisible = false;
                this.userStateService.clearPendingOperation();
                this.currentUser = null;
                this.currentAction = '';
              },
              error: (error: any) => {
                let mensajeError = 'Error al rechazar la solicitud';
                let esErrorPassword = false;
                
                if (error.status === 401 || error.error?.code === 'PASSWORD_INCORRECT') {
                  mensajeError = 'Contraseña incorrecta';
                  esErrorPassword = true;
                } else if (error.error?.message) {
                  mensajeError = error.error.message;
                } else if (error.message) {
                  mensajeError = error.message;
                }
                
                if (esErrorPassword) {
                  this.passwordModalError = mensajeError;
                } else {
                  this.isPasswordModalVisible = false;
                  this.mostrarModalSuccess(mensajeError, 'Entendido');
                  this.userStateService.clearPendingOperation();
                  this.currentUser = null;
                  this.currentAction = '';
                }
              }
            });
        }
        break;

      default:
        this.isPasswordModalVisible = false;
        this.userStateService.clearPendingOperation();
    }
  }

  closeChangePasswordModal(): void {
    this.isChangePasswordModalVisible = false;
    this.currentUser = null;
    this.currentAction = '';
  }

  handlePasswordChanged(nuevaPassword: string): void {
  this.isChangePasswordModalVisible = false;
  this.currentUser = null;
  this.currentAction = '';
  this.mostrarModalSuccess('Contraseña cambiada con éxito', 'Aceptar');
  this.cargarUsuarios();
}

  abrirConfirmModal(tipo: 'inactivar' | 'activar' | 'eliminarQR' | 'rechazar', usuario: Usuario) {
    this.confirmModalAction = tipo;
    this.currentUser = usuario;
    this.passwordModalError = '';
    this.userStateService.setPendingOperation(usuario, tipo);
    
    switch(tipo) {
      case 'inactivar':
        this.confirmModalMessage = '¿Está seguro de que desea inactivar el usuario?';
        break;
      case 'activar':
        this.confirmModalMessage = '¿Está seguro de que desea activar el usuario?';
        break;
      case 'eliminarQR':
        this.confirmModalMessage = '¿Está seguro de que desea eliminar el código QR?';
        break;
      case 'rechazar':
        this.confirmModalMessage = '¿Está seguro de que desea rechazar la solicitud de este usuario? El usuario quedará en estado INACTIVO.';
        break;
    }

    this.confirmModalVisible = true;
  }

  onAceptarConfirmacion() {
    this.confirmModalVisible = false;
    this.passwordModalError = '';
    
    if (!this.currentUser) {
      const pending = this.userStateService.getPendingOperation();
      this.currentUser = pending.user;
      this.confirmModalAction = pending.action as any;
    }
    
    switch(this.confirmModalAction) {
      case 'inactivar':
        this.mensajePasswordModal = 'Ingrese su contraseña para inactivar el usuario.';
        this.currentAction = 'inactivar';
        this.isPasswordModalVisible = true;
        break;
        
      case 'activar':
        this.mensajePasswordModal = 'Ingrese su contraseña para activar el usuario.';
        this.currentAction = 'activar';
        this.isPasswordModalVisible = true;
        break;
        
      case 'eliminarQR':
        this.mensajePasswordModal = 'Ingrese su contraseña para eliminar el código QR.';
        this.currentAction = 'eliminarQR';
        this.isPasswordModalVisible = true;
        break;
        
      case 'rechazar':
        this.mensajePasswordModal = 'Ingrese su contraseña para rechazar la solicitud. El usuario quedará INACTIVO.';
        this.currentAction = 'rechazar';
        this.isPasswordModalVisible = true;
        break;
    }
  }

  onCancelarConfirmacion() {
    this.confirmModalVisible = false;
    this.confirmModalAction = null;
    this.currentUser = null;
  }

  handlePasswordChange(nuevaPassword: string): void {
    if (!nuevaPassword.trim()) {
      return alert('La nueva contraseña no puede estar vacía');
    }

    if (this.currentUser && this.currentUser.idUsuario) {
      this.userService.cambiarPasswordUsuario(this.currentUser.idUsuario, nuevaPassword)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (response: any) => {
            this.mostrarModalSuccess('Contraseña cambiada con éxito', 'Aceptar');
            this.cargarUsuarios();
          },
          error: (error: any) => {
            console.error('Error cambiando contraseña:', error);
            alert('Error al cambiar la contraseña: ' + (error.message || 'Error desconocido'));
          }
        });
    }
  }

  // Métodos para alertas externas
  showExternalAlert(type: 'success' | 'danger' | 'info' | 'warning', title: string, message: string, duration: number = 5000): void {
    const alertItem = { type, title, message };
    this.externalAlerts.push(alertItem);

    // Auto-cerrar después de la duración especificada
    if (duration > 0) {
      setTimeout(() => {
        const index = this.externalAlerts.indexOf(alertItem);
        if (index > -1) {
          this.closeExternalAlert(index);
        }
      }, duration);
    }
  }

  closeExternalAlert(index: number): void {
    this.externalAlerts.splice(index, 1);
  }

  sortBy(field: string): void {
    if (this.currentOrder === field) {
      this.ascendingOrder = !this.ascendingOrder;
    } else {
      this.currentOrder = field;
      this.ascendingOrder = true;
    }
    this.filtrarUsuarios();
  }

  getSortIcon(field: string): any {
    if (this.currentOrder !== field) {
      return { 'bi-arrow-down-up': true, 'text-muted': true };
    }
    return this.ascendingOrder ? { 'bi-arrow-down': true } : { 'bi-arrow-up': true };
  }

  private sortUsuarios(usuarios: Usuario[], field: string, ascending: boolean): Usuario[] {
    return usuarios.sort((a, b) => {
      let valueA: any;
      let valueB: any;

      switch (field) {
        case 'idUsuario':
          valueA = a.idUsuario || 0;
          valueB = b.idUsuario || 0;
          break;
        case 'identificacion':
          valueA = a.identificacion || '';
          valueB = b.identificacion || '';
          break;
        case 'estado':
          valueA = typeof a.estado === 'object' 
            ? (a.estado.descripcion || '').toString().toLowerCase()
            : String(a.estado || '').toLowerCase();
          valueB = typeof b.estado === 'object' 
            ? (b.estado.descripcion || '').toString().toLowerCase()
            : String(b.estado || '').toLowerCase();
          break;
        default:
          return 0;
      }

      if (typeof valueA === 'number' && typeof valueB === 'number') {
        return ascending ? valueA - valueB : valueB - valueA;
      } else {
        const comparison = valueA.toString().localeCompare(valueB.toString());
        return ascending ? comparison : -comparison;
      }
    });
  }

}
