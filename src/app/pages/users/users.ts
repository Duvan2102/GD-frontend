import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Controls } from '../approvals/controls/controls';
import { FooterControls } from '../approvals/footer-controls/footer-controls';

interface Usuario {
  noUsuario: number;
  identificacion: string;
  nombres: string;
  apellidos: string;
  usuario: string;
  estado: string;
  activo: boolean;
}

@Component({
  selector: 'app-usuarios',
  templateUrl: './users.html',
  styleUrls: ['./users.css'],
  standalone: true,
  imports: [CommonModule, FormsModule, Controls, FooterControls]
})
export class Users {
  usuarios: Usuario[] = [];
  usuariosFiltrados: Usuario[] = [];
  usuariosFiltradosLength = 0;
  searchTerm = '';
  activos = true;

  // === PAGINACIÓN ===
  itemsPerPage = 10;
  itemsOptions = [10, 25, 50, 100];
  paginaActual = 1;    // 1-based
  paginaInicio = 0;
  paginaFin = 0;

  filaDesplegada: number | null = null;

  constructor() {
    // ejemplo de datos
    for (let i = 1; i <= 52; i++) {
      this.usuarios.push({
        noUsuario: i,
        identificacion: `ID-${i}`,
        nombres: `Nombre${i}`,
        apellidos: `Apellido${i}`,
        usuario: `usuario${i}`,
        estado: i % 2 === 0 ? 'Activo' : 'Inactivo',
        activo: i % 2 === 0
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

    // slice usando página 1-based
    const start = (this.paginaActual - 1) * this.itemsPerPage;
    this.usuariosFiltrados = filtrados.slice(start, start + this.itemsPerPage);

    this.actualizarPaginacion();
    this.filaDesplegada = null;
  }

  // cuando cambias el número de página desde el footer
  onChangePage(page: number) {
    this.paginaActual = page;
    this.filtrarUsuarios();
  }

  // handlers para app-controls
  onChangeCantidad(cantidad: number) {
    this.itemsPerPage = +cantidad;
    this.paginaActual = 1;
    this.filtrarUsuarios();
  }

  onToggleActivos(checked: boolean) {
    this.activos = checked;
    this.paginaActual = 1;
    this.filtrarUsuarios();
  }

  onBuscar(valor: string) {
    this.searchTerm = valor;
    this.paginaActual = 1;
    this.filtrarUsuarios();
  }

  // abrir/cerrar fila desplegable
  toggleDesplegable(i: number) {
    this.filaDesplegada = this.filaDesplegada === i ? null : i;
  }

  accion(tipo: string, u: Usuario, e: Event) {
    e.preventDefault();
    alert(`Acción "${tipo}" sobre ${u.nombres} ${u.apellidos}`);
  }

  private actualizarPaginacion() {
    if (this.usuariosFiltradosLength > 0) {
      const start = (this.paginaActual - 1) * this.itemsPerPage;
      this.paginaInicio = start + 1;
      this.paginaFin = Math.min(start + this.itemsPerPage, this.usuariosFiltradosLength);
    } else {
      this.paginaInicio = 0;
      this.paginaFin = 0;
    }
  }
}
