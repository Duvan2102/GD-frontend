import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { Usuario } from '../interfaces/common.interfaces';
import { Position } from './positions.service';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private currentUser: Usuario & { cargoCompleto: Position } = {
    noUsuario: 2,
    identificacion: '123456789',
    nombres: 'Usuario',
    apellidos: 'De Prueba',
    usuario: 'usuario.prueba',
    estado: 'Activo',
    activo: true,
    cargo: 'Administrador Principal',
    cargoCompleto: {
      idCargo: 1,
      descripcion: 'Administrador Principal',
      area: {
        idArea: 1,
        descripcion: 'Área de TI',
        departamento: {
          idDepartamento: 1,
          descripcion: 'Tecnología'
        }
      },
      permisos: {
        esAdministrador: true,
        esAuditor: false
      }
    }
  };

  constructor() { }

  getCurrentUser(): Observable<Usuario & { cargoCompleto: Position }> {
    return of(this.currentUser);
  }

  // Acceso síncrono para interceptores y headers
  getCurrentUserValue(): (Usuario & { cargoCompleto: Position }) | null {
    return this.currentUser ?? null;
  }

  // Permisos según privilegio por letra del cargo: E=Admin, I=Usuario, A=Auditor
  setCargoPrivilege(privilegio: 'E'|'I'|'A'): void {
    const isAdmin = privilegio === 'E';
    const isAuditor = privilegio === 'A';
    this.currentUser.cargoCompleto.permisos = {
      esAdministrador: isAdmin,
      esAuditor: isAuditor
    };
  }

  // El administrador tiene acceso a las vistas de Usuarios y Administración
  canAccessAdmin(): boolean {
    return this.currentUser.cargoCompleto.permisos?.esAdministrador ?? false;
  }

  canAccessUsers(): boolean {
    return this.currentUser.cargoCompleto.permisos?.esAdministrador ?? false;
  }

  // El auditor tiene acceso a la vista de Reportes
  canAccessReports(): boolean {
    return this.currentUser.cargoCompleto.permisos?.esAuditor ?? false;
  }
}
