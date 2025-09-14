import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../environments/environment';

export interface ChangePasswordRequest {
  nuevaPassword: string;
}

export interface UserInfoResponse {
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

@Injectable({
  providedIn: 'root'
})
export class PasswordResetService {
  private readonly API_BASE_URL = environment.apiUrl;

  constructor(private http: HttpClient) {}

  /**
   * Obtener información del usuario por ID
   */
  getUserInfo(userId: number): Observable<UserInfoResponse> {
    return this.http.get<UserInfoResponse>(`${this.API_BASE_URL}/api/usuarios/${userId}`);
  }

  /**
   * Cambiar contraseña del usuario
   */
  changePassword(userId: number, newPassword: string): Observable<any> {
    const request: ChangePasswordRequest = { nuevaPassword: newPassword };
    return this.http.put(`${this.API_BASE_URL}/api/usuarios/${userId}/password`, request);
  }
}
