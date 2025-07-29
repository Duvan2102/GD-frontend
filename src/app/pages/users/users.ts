import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Controls } from '../approvals/controls/controls';
import { FooterControls } from '../approvals/footer-controls/footer-controls';
import { UserFormModal } from './user-form-modal/user-form-modal';
import { PasswordModal } from './password-modal/password-modal';
import { SuccessModal } from './success-modal/success-modal';
import { ConfirmModal } from './confirm-modal/confirm-modal';
import { ChangePassword } from './change-password/change-password';

export interface Usuario {
  noUsuario: number;
  identificacion: string;
  nombres: string;
  apellidos: string;
  usuario: string;
  estado: string;
  activo: boolean;
  cargo?: string;
  correoEmpresarial?: string;
  correoPersonal?: string;
  celular?: string;
  telefono?: string;
  direccion?: string;
  dobleAutenticacion?: string;
  perfiles?: {
    administrador: boolean;
    funcionarioCreador: boolean;
    funcionarios: boolean;
  };
}

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
export class Users {
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
  isChangePasswordModalVisible = false; // <-- AÑADIDO
  currentUser: Usuario | null = null;
  currentAction = '';
  mensajePasswordModal: string = '';

  // -------- MODAL DE ÉXITO / CONFIRMACIÓN --------
  modalSuccessVisible: boolean = false;
  modalSuccessMessage: string = '';
  modalSuccessBtn: string = 'Aceptar';
  modalIsConfirmation: boolean = false;

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
  // -----------------------------------------------

  constructor() {
    for (let i = 1; i <= 52; i++) {
      this.usuarios.push({
        noUsuario: i,
        identificacion: `ID-${i}`,
        nombres: `Nombre${i}`,
        apellidos: `Apellido${i}`,
        usuario: `usuario${i}`,
        estado: i % 2 === 0 ? 'Activo' : 'Inactivo',
        activo: i % 2 === 0,
        cargo: 'Funcionario',
        correoEmpresarial: `usuario${i}@empresa.com`,
        correoPersonal: `usuario${i}@personal.com`,
        celular: `300${i}566677`,
        telefono: `5005566677`,
        direccion: `Calle 45 # 22-18`,
        dobleAutenticacion: 'Google Authenticator',
        perfiles: {
          administrador: i === 1,
          funcionarioCreador: i <= 5,
          funcionarios: i > 5
        }
      });
    }
    this.filtrarUsuarios();
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
    this.currentUser = userData;
    this.isUserFormVisible = false;
    this.mensajePasswordModal = this.currentAction === 'crear'
      ? 'Ingrese su contraseña para finalizar la creación del usuario.'
      : 'Ingrese su contraseña para guardar los cambios.';
    this.isPasswordModalVisible = true;
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
        const nuevo: Usuario = {
          ...this.currentUser!,
          noUsuario: this.usuarios.length + 1,
          estado: 'Activo',
          activo: true
        };
        this.usuarios.push(nuevo);
        this.mostrarModalSuccess('Usuario creado con éxito', 'Aceptar');
        break;

      case 'editar':
        const idx = this.usuarios.findIndex(u => u.noUsuario === this.currentUser!.noUsuario);
        if (idx > -1) {
          this.usuarios[idx] = { ...this.currentUser! };
        }
        this.mostrarModalSuccess('Usuario editado con éxito', 'Aceptar');
        break;

      case 'inactivar':
        const idxInactivar = this.usuarios.findIndex(u => u.noUsuario === this.currentUser!.noUsuario);
        if (idxInactivar > -1) {
          this.usuarios[idxInactivar].estado = 'Inactivo';
          this.usuarios[idxInactivar].activo = false;
        }
        this.mostrarModalSuccess('Usuario inactivado con éxito', 'Aceptar');
        break;

      // --- MODIFICADO PARA ABRIR EL MODAL DE CAMBIO DE CONTRASEÑA ---
      case 'cambiarContraseña':
        this.isPasswordModalVisible = false;
        this.isChangePasswordModalVisible = true;
        break;
      // ---------------------------------------------------------------

      case 'eliminarQR':
        const idxQR = this.usuarios.findIndex(u => u.noUsuario === this.currentUser!.noUsuario);
        if (idxQR > -1) {
          this.usuarios[idxQR].dobleAutenticacion = '';
        }
        this.mostrarModalSuccess('Código QR eliminado con éxito', 'Aceptar');
        break;

      default:
        console.log('Acción no reconocida en validación:', this.currentAction);
    }

    // Solo limpiar si NO es cambio de contraseña
    if (this.currentAction !== 'cambiarContraseña') {
      this.filtrarUsuarios();
      this.isPasswordModalVisible = false;
      this.currentUser = null;
      this.currentAction = '';
    }
  }

  // --- MÉTODOS AÑADIDOS PARA MODAL DE CAMBIO DE CONTRASEÑA ---
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
  // --- FIN MÉTODOS AÑADIDOS ---

  confirmModalVisible = false;
  confirmModalMessage = '';
  confirmModalAction: 'inactivar' | 'eliminarQR' | null = null;

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
