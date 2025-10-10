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
  isUserFormVisible = false;
  isPasswordModalVisible = false;
  isChangePasswordModalVisible = false;
  isChange2FAMethodModalVisible = false;
  isRegisterUserModalVisible = false;
  selected2FAMethod: 'GOOGLE_AUTH' | 'EMAIL' = 'GOOGLE_AUTH';
  currentUser: Usuario | null = null;
  currentAction = '';
  mensajePasswordModal: string = '';

  isLoading = false;
  errorMessage = '';
  private destroy$ = new Subject<void>();
  modalSuccessVisible: boolean = false;
  modalSuccessMessage: string = '';
  modalSuccessBtn: string = 'Aceptar';
  modalIsConfirmation: boolean = false;

  confirmModalVisible = false;
  confirmModalMessage = '';
  confirmModalAction: 'inactivar' | 'activar' | 'eliminarQR' | null = null;

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
  mostrarModalConfirmacion(mensaje: string, textoBtn: string = 'Aceptar') {
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
    if (
      this.modalIsConfirmation &&
      (this.currentAction === 'inactivar' || this.currentAction === 'eliminarQR')
    ) {
      this.modalSuccessVisible = false;
      this.isPasswordModalVisible = true;
      this.mensajePasswordModal =
        this.currentAction === 'inactivar'
          ? 'Ingrese su contraseña para inactivar el usuario.'
          : 'Ingrese su contraseña para eliminar el código QR del usuario.';
    } else {
      this.modalSuccessVisible = false;
      this.currentUser = null;
      this.currentAction = '';
    }
  }

  filtrarUsuarios() {
    let filtrados = this.usuarios.filter(u => {
      if (this.activos) {
        // Verificar múltiples formas de saber si está activo o pendiente
        const estadoDescripcion = typeof u.estado === 'object'
          ? (u.estado.descripcion || '').toString().trim().toUpperCase()
          : String(u.estado || '').trim().toUpperCase();

        // Usar tanto la propiedad activo como el estado.descripcion para filtrar
        return estadoDescripcion === 'ACTIVO' || estadoDescripcion === 'PENDIENTE' || u.activo === true;
      } else {
        return true;
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
        this.mostrarModalConfirmacion(
          `¿Está seguro de inactivar al usuario ${u.nombres} ${u.apellidos}?`,
          'Sí, inactivar'
        );
        break;

      case 'cambiarContraseña':
        this.mensajePasswordModal = 'Ingrese su contraseña para cambiar la contraseña del usuario.';
        this.isPasswordModalVisible = true;
        break;

      case 'cambiar2FA':
        this.abrirModal2FA(u);
        break;

      case 'eliminarQR':
        this.mensajePasswordModal = 'Ingrese su contraseña para eliminar el código QR del usuario.';
        this.isPasswordModalVisible = true;
        break;

      default:
    }
  }

  abrirModal2FA(usuario: Usuario): void {
    this.currentUser = { ...usuario };
    this.currentAction = 'cambiar2FA';
    
    // Verificar si el usuario tiene 2FA habilitado
    if (!usuario.dobleAutenticacion) {
      this.mostrarModalSuccess(
        'Este usuario no tiene la doble autenticación habilitada. Para habilitar 2FA, el usuario debe configurarlo desde su perfil al iniciar sesión.',
        'Entendido'
      );
      return;
    }
    
    // Determinar el método actual y establecerlo como seleccionado
    const dobleAuth = usuario.dobleAutenticacion;
    if (dobleAuth === 'GOOGLE_AUTH') {
      this.selected2FAMethod = 'GOOGLE_AUTH';
    } else if (dobleAuth === 'EMAIL') {
      this.selected2FAMethod = 'EMAIL';
    } else if (typeof dobleAuth === 'boolean' && dobleAuth) {
      // Por defecto, si es boolean true, asumir GOOGLE_AUTH
      this.selected2FAMethod = 'GOOGLE_AUTH';
    } else {
      // Por defecto GOOGLE_AUTH
      this.selected2FAMethod = 'GOOGLE_AUTH';
    }
    
    // Abrir el modal
    this.isChange2FAMethodModalVisible = true;
  }

  closeChange2FAMethodModal(): void {
    this.isChange2FAMethodModalVisible = false;
    this.currentUser = null;
    this.currentAction = '';
  }

  on2FAMethodChange(): void {
    if (!this.currentUser || !this.currentUser.idUsuario) {
      alert('Error: No se encontró la información del usuario');
      this.closeChange2FAMethodModal();
      return;
    }

    if (!this.selected2FAMethod) {
      alert('Por favor selecciona un método de autenticación');
      return;
    }

    this.authService.change2FAMethod(this.currentUser.idUsuario, this.selected2FAMethod)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response: any) => {
          let mensaje = response.message || 'Método de autenticación cambiado correctamente';
          if (response.qrCodeUrl) {
            mensaje += '\n\nSe ha generado un nuevo código QR. El usuario deberá escanearlo en su próximo login.';
          }
          this.closeChange2FAMethodModal();
          this.mostrarModalSuccess(mensaje, 'Aceptar');
          this.cargarUsuarios();
        },
        error: (error: any) => {
          console.error('Error cambiando método 2FA:', error);
          let mensajeError = 'Error al cambiar el método de autenticación';
          
          if (error.error?.code === '2FA_DISABLED') {
            mensajeError = 'La doble autenticación no está habilitada para este usuario. El usuario debe habilitarla desde su perfil.';
          } else if (error.error?.message) {
            mensajeError = error.error.message;
          } else if (error.message) {
            mensajeError = error.message;
          }
          
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
    console.log('Usuario registrado con ID:', event.idUsuario);
    this.closeRegisterUserModal();
    
    // Mostrar mensaje de éxito y recargar usuarios
    this.modalSuccessMessage = `Usuario registrado exitosamente con ID: ${event.idUsuario}. Debe ser activado por un administrador.`;
    this.modalSuccessBtn = 'Aceptar';
    this.modalSuccessVisible = true;
    
    // Recargar la lista de usuarios
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
    this.cargarUsuarios();
    this.isUserFormVisible = false;
    this.currentUser = null;
    this.currentAction = '';
  }

  closePasswordModal(): void {
    this.isPasswordModalVisible = false;
    this.currentUser = null;
    this.currentAction = '';
  }

  handlePasswordValidation(password: string): void {
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
              this.cargarUsuarios();
              this.isPasswordModalVisible = false;
              this.userStateService.clearPendingOperation();
            },
            error: (error: any) => {
              if (error.error?.code === 'PASSWORD_INCORRECT') {
                alert('Contraseña incorrecta. Intente nuevamente.');
              } else {
                alert('Error al eliminar el código QR: ' + (error.error?.message || error.message || 'Error desconocido'));
              }
              this.userStateService.clearPendingOperation();
            }
          });
      }
    } else {
      this.confirmAction(password);
    }
  }

  handlePasswordValidationError(error: string): void {}

  confirmAction(password: string): void {
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
                this.cargarUsuarios();
                this.isPasswordModalVisible = false;
                this.userStateService.clearPendingOperation();
              },
              error: (error: any) => {
                alert('Error al inactivar el usuario: ' + (error.message || 'Error desconocido'));
                this.isPasswordModalVisible = false;
                this.userStateService.clearPendingOperation();
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
                this.cargarUsuarios();
                this.isPasswordModalVisible = false;
                this.userStateService.clearPendingOperation();
              },
              error: (error: any) => {
                alert('Error al activar el usuario: ' + (error.message || 'Error desconocido'));
                this.isPasswordModalVisible = false;
                this.userStateService.clearPendingOperation();
              }
            });
        }
        break;

      case 'cambiarContraseña':
        this.isPasswordModalVisible = false;
        this.isChangePasswordModalVisible = true;
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

  abrirConfirmModal(tipo: 'inactivar' | 'activar' | 'eliminarQR', usuario: Usuario) {
    this.confirmModalAction = tipo;
    this.currentUser = usuario;
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
    }

    this.confirmModalVisible = true;
  }

  onAceptarConfirmacion() {
    this.confirmModalVisible = false;
    
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

}
