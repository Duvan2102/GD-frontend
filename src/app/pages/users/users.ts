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
import { UserService } from '../../services/user.service';
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
    ChangePassword
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
  currentUser: Usuario | null = null;
  currentAction = '';
  mensajePasswordModal: string = '';
  
  isLoading = false;
  errorMessage = '';
  private destroy$ = new Subject<void>();

  // -------- MODAL DE ÉXITO / CONFIRMACIÓN --------
  modalSuccessVisible: boolean = false;
  modalSuccessMessage: string = '';
  modalSuccessBtn: string = 'Aceptar';
  modalIsConfirmation: boolean = false;

  confirmModalVisible = false;
  confirmModalMessage = '';
  confirmModalAction: 'inactivar' | 'eliminarQR' | null = null;

  constructor(private userService: UserService) {}

  ngOnInit(): void {
    this.cargarUsuarios();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  cargarUsuarios(): void {
    this.isLoading = true;
    this.errorMessage = '';
    
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
          this.errorMessage = 'Error al cargar los usuarios. Usando datos de ejemplo.';
          this.isLoading = false;
          this.cargarDatosDeEjemplo();
        }
      });
  }

  private cargarDatosDeEjemplo(): void {
    for (let i = 1; i <= 52; i++) {
      this.usuarios.push({
        noUsuario: i,
        identificacion: `12345678${i.toString().padStart(2, '0')}`,
        nombres: `Nombre${i}`,
        apellidos: `Apellido${i}`,
        usuario: `usuario${i}`,
        estado: i % 2 === 0 ? 'Activo' : 'Inactivo',
        activo: i % 2 === 0,
        cargo: 'Funcionario',
        correoEmpresarial: `usuario${i}@empresa.com`,
        correoPersonal: `usuario${i}@personal.com`,
        celular: `300${i.toString().padStart(7, '0')}`,
        telefono: `5005566677`,
        direccion: `Calle 45 # 22-18`,
        dobleAutenticacion: 'Google Authenticator',
        perfiles: {
          administrador: i === 1,
          funcionarioCreador: i <= 5,
          funcionarios: i > 5
        }
      } as Usuario);
    }
    this.filtrarUsuarios();
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
    let filtrados = this.usuarios.filter(u => this.activos ? u.activo : true);

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
    this.activos = checked;
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

      case 'eliminarQR':
        this.mostrarModalConfirmacion(
          `¿Está seguro de eliminar el código QR de ${u.nombres} ${u.apellidos}?`,
          'Sí, eliminar QR'
        );
        break;

      default:
        console.log('Acción no reconocida:', tipo);
    }
  }

  openCreateUserModal(): void {
    this.currentUser = null;
    this.currentAction = 'crear';
    this.mensajePasswordModal = 'Por favor ingrese su contraseña para crear el usuario.';
    this.isUserFormVisible = true;
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
    if (!password.trim()) {
      return alert('La contraseña no puede estar vacía');
    }

    switch (this.currentAction) {
      case 'crear':
        if (this.currentUser) {
          this.userService.crearUsuario(this.currentUser)
            .pipe(takeUntil(this.destroy$))
            .subscribe({
              next: (response) => {
                this.mostrarModalSuccess('Usuario creado con éxito', 'Aceptar');
                this.cargarUsuarios();
              },
              error: (error) => {
                console.error('Error creando usuario:', error);
                alert('Error al crear el usuario: ' + (error.message || 'Error desconocido'));
              }
            });
        }
        break;

      case 'editar':
        if (this.currentUser) {
          this.userService.actualizarUsuario(this.currentUser)
            .pipe(takeUntil(this.destroy$))
            .subscribe({
              next: (response) => {
                this.mostrarModalSuccess('Usuario editado con éxito', 'Aceptar');
                this.cargarUsuarios();
              },
              error: (error) => {
                console.error('Error actualizando usuario:', error);
                alert('Error al actualizar el usuario: ' + (error.message || 'Error desconocido'));
              }
            });
        }
        break;

      case 'inactivar':
        if (this.currentUser) {
          const usuarioInactivado = { ...this.currentUser, estado: 'Inactivo', activo: false };
          this.userService.actualizarUsuario(usuarioInactivado)
            .pipe(takeUntil(this.destroy$))
            .subscribe({
              next: () => {
                this.mostrarModalSuccess('Usuario inactivado con éxito', 'Aceptar');
                this.cargarUsuarios();
              },
              error: (error) => {
                console.error('Error inactivando usuario:', error);
                alert('Error al inactivar el usuario: ' + (error.message || 'Error desconocido'));
              }
            });
        }
        break;

      case 'cambiarContraseña':
        this.isPasswordModalVisible = false;
        this.isChangePasswordModalVisible = true;
        break;

      case 'eliminarQR':
        if (this.currentUser) {
          const usuarioSinQR = { ...this.currentUser, dobleAutenticacion: '' };
          this.userService.actualizarUsuario(usuarioSinQR)
            .pipe(takeUntil(this.destroy$))
            .subscribe({
              next: () => {
                this.mostrarModalSuccess('Código QR eliminado con éxito', 'Aceptar');
                this.cargarUsuarios();
              },
              error: (error) => {
                console.error('Error eliminando QR:', error);
                alert('Error al eliminar el código QR: ' + (error.message || 'Error desconocido'));
              }
            });
        }
        break;

      default:
        console.log('Acción no reconocida en validación:', this.currentAction);
    }

    if (this.currentAction !== 'cambiarContraseña') {
      this.isPasswordModalVisible = false;
      this.currentUser = null;
      this.currentAction = '';
    }
  }

  closeChangePasswordModal(): void {
    this.isChangePasswordModalVisible = false;
    this.currentUser = null;
    this.currentAction = '';
  }

  handlePasswordChanged(): void {
    this.isChangePasswordModalVisible = false;
    this.currentUser = null;
    this.currentAction = '';
    this.mostrarModalSuccess('Contraseña cambiada con éxito', 'Aceptar');
    this.filtrarUsuarios();
  }

  abrirConfirmModal(tipo: 'inactivar' | 'eliminarQR', usuario: Usuario) {
    this.confirmModalAction = tipo;
    this.currentUser = usuario;
    this.confirmModalMessage =
      tipo === 'inactivar'
        ? '¿Está seguro de que desea inactivar el usuario?'
        : '¿Está seguro de que desea eliminar el código QR?';
    this.confirmModalVisible = true;
  }

  onAceptarConfirmacion() {
    this.confirmModalVisible = false;
    if (this.confirmModalAction === 'inactivar') {
      this.mensajePasswordModal = 'Ingrese su contraseña para inactivar el usuario.';
      this.isPasswordModalVisible = true;
      this.currentAction = 'inactivar';
    } else if (this.confirmModalAction === 'eliminarQR') {
      this.mensajePasswordModal = 'Ingrese su contraseña para eliminar el código QR.';
      this.isPasswordModalVisible = true;
      this.currentAction = 'eliminarQR';
    }
  }

  onCancelarConfirmacion() {
    this.confirmModalVisible = false;
    this.confirmModalAction = null;
    this.currentUser = null;
  }
}