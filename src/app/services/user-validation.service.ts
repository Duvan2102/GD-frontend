import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

export interface Usuario {
  idUsuario: number;
  identificacion: string;
  nombres: string;
  apellidos: string;
  usuario: string;
  cargo: {
    idCargo: number;
    descripcion: string;
    area: {
      idArea: number;
      descripcion: string;
      departamento: {
        idDepartamento: number;
        descripcion: string;
      };
    };
  };
  estado: {
    idEstado: number;
    descripcion: string;
  };
  rol: {
    idRol: number;
    descripcion: string;
  };
  correoEmpresarial: string;
  correoPersonal: string;
  telefono1: string;
  telefono2: string;
  direccion: string;
  dobleAutenticacion: boolean;
}

export interface UsuariosResponse {
  content: Usuario[];
  pageable: any;
  last: boolean;
  totalPages: number;
  totalElements: number;
  size: number;
  number: number;
  sort: any;
  first: boolean;
  numberOfElements: number;
  empty: boolean;
}

export interface UserValidationResult {
  exists: boolean;
  isActive: boolean;
  user?: Usuario;
  message?: string;
}

@Injectable({
  providedIn: 'root'
})
export class UserValidationService {
  private readonly API_URL = 'http://200.7.99.74:8080/api/usuarios';

  constructor(private http: HttpClient) { }

  /**
   * Obtiene todos los usuarios del sistema
   */
  getAllUsers(): Observable<Usuario[]> {
    return this.http.get<UsuariosResponse>(this.API_URL).pipe(
      map(response => response.content)
    );
  }

  /**
   * Valida si un correo electrónico existe en el sistema
   * @param email - Correo electrónico a validar
   * @returns Observable con el resultado de la validación
   */
  validateUserByEmail(email: string): Observable<UserValidationResult> {
    return this.getAllUsers().pipe(
      map(usuarios => {
        // Buscar usuario por correo empresarial o personal
        const usuario = usuarios.find(u => 
          u.correoEmpresarial?.toLowerCase() === email.toLowerCase() ||
          u.correoPersonal?.toLowerCase() === email.toLowerCase()
        );

        if (!usuario) {
          return {
            exists: false,
            isActive: false,
            message: 'El correo electrónico ingresado no está registrado en nuestro sistema.'
          };
        }

        // Verificar si el usuario está activo
        const isActive = usuario.estado?.descripcion === 'ACTIVO';
        
        if (!isActive) {
          return {
            exists: true,
            isActive: false,
            user: usuario,
            message: 'Su cuenta se encuentra inactiva. Por favor, contacte al administrador del sistema.'
          };
        }

        return {
          exists: true,
          isActive: true,
          user: usuario,
          message: 'Usuario válido y activo.'
        };
      })
    );
  }

  /**
   * Valida si un usuario existe por nombre de usuario
   * @param username - Nombre de usuario a validar
   * @returns Observable con el resultado de la validación
   */
  validateUserByUsername(username: string): Observable<UserValidationResult> {
    return this.getAllUsers().pipe(
      map(usuarios => {
        const usuario = usuarios.find(u => 
          u.usuario?.toLowerCase() === username.toLowerCase()
        );

        if (!usuario) {
          return {
            exists: false,
            isActive: false,
            message: 'El usuario ingresado no está registrado en nuestro sistema.'
          };
        }

        const isActive = usuario.estado?.descripcion === 'ACTIVO';
        
        if (!isActive) {
          return {
            exists: true,
            isActive: false,
            user: usuario,
            message: 'Su cuenta se encuentra inactiva. Por favor, contacte al administrador del sistema.'
          };
        }

        return {
          exists: true,
          isActive: true,
          user: usuario,
          message: 'Usuario válido y activo.'
        };
      })
    );
  }
}
