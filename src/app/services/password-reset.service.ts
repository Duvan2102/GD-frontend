import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../environments/environment';

export interface RequestPasswordResetRequest {
  email: string;
}

export interface RequestPasswordResetResponse {
  message: string;
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
  dobleAutenticacion?: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class PasswordResetService {
  private readonly API_BASE_URL = environment.apiUrl;

  constructor(private http: HttpClient) {}

  /**
   * Solicitar restablecimiento de contraseña por email
   */
  requestPasswordReset(email: string): Observable<RequestPasswordResetResponse> {
    const request: RequestPasswordResetRequest = { email: email };
    return this.http.post<RequestPasswordResetResponse>(`${this.API_BASE_URL}/auth/password/request-reset`, request);
  }

  /**
   * Validar token de restablecimiento
   */
  validateToken(token: string): Observable<{valid: boolean}> {
    return this.http.get<{valid: boolean}>(`${this.API_BASE_URL}/auth/password/validate-token?token=${encodeURIComponent(token)}`);
  }

  /**
   * Obtener información del usuario por token
   */
  getUserInfoByToken(token: string): Observable<UserInfoResponse> {
    return this.http.get<UserInfoResponse>(`${this.API_BASE_URL}/auth/password/user-info?token=${encodeURIComponent(token)}`);
  }

  /**
   * Restablecer contraseña con token
   */
  resetPassword(token: string, newPassword: string): Observable<{message: string}> {
    const request = { token, newPassword };
    return this.http.post<{message: string}>(`${this.API_BASE_URL}/auth/password/reset`, request);
  }
}
