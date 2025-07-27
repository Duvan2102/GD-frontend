import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, retry, tap } from 'rxjs/operators';
import { Usuario } from '../pages/users/users';
import { environment } from '../environments/environment.prod';

export interface UsuarioRequest {
  identificacion: string;
  nombres: string;
  apellidos: string;
  usuario: string;
  cargo: {
    idCargo: number;
  };
  correoEmpresarial: string;
  correoPersonal: string;
  telefono1: string;
  telefono2: string;
  direccion: string;
  dobleAutenticacion: boolean;
}

export interface ApiResponse<T = any> {
  success: boolean;
  message: string;
  data?: T;
}

@Injectable({
  providedIn: 'root'
})
export class UserService {
  private readonly apiUrl = environment.apiUrl;  
  private readonly cargosMap: { [key: string]: number } = {
    'Gerente': 1,
    'Analista': 2,
    'Desarrollador': 3,
    'Administrador': 4,
    'Coordinador': 5,
    'Supervisor': 6
  };
  constructor(private http: HttpClient) {}
  private getHttpOptions() {
    return {
      headers: new HttpHeaders({
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      })
    };
  }
  private handleError = (error: HttpErrorResponse) => {
    let errorMessage = 'Error desconocido';    
    if (error.error instanceof ErrorEvent) {
      errorMessage = `Error de conexión: ${error.error.message}`;
    } else {
      switch (error.status) {
        case 0:
          errorMessage = 'No se puede conectar al servidor. Verifica tu conexión a internet.';
          break;
        case 400:
          errorMessage = error.error?.message || 'Datos inválidos. Verifica la información ingresada.';
          break;
        case 401:
          errorMessage = 'No tienes autorización para realizar esta operación.';
          break;
        case 403:
          errorMessage = 'Acceso prohibido. Contacta al administrador.';
          break;
        case 404:
          errorMessage = 'El usuario no fue encontrado.';
          break;
        case 409:
          errorMessage = 'Ya existe un usuario con esta identificación o nombre de usuario.';
          break;
        case 422:
          errorMessage = 'Los datos enviados no son válidos.';
          break;
        case 500:
          errorMessage = 'Error interno del servidor. Intenta más tarde.';
          break;
        case 503:
          errorMessage = 'Servicio no disponible temporalmente.';
          break;
        default:
          errorMessage = `Error ${error.status}: ${error.error?.message || error.message}`;
      }
    }    
    console.error('Error completo:', error);
    return throwError(() => new Error(errorMessage));
  };
  obtenerUsuarios(): Observable<Usuario[]> {
    return this.http.get<Usuario[]>(this.apiUrl, this.getHttpOptions())
      .pipe(
        tap(usuarios => console.log(`Se obtuvieron ${usuarios.length} usuarios`)),
        retry(2),
        catchError(this.handleError)
      );
  }
  obtenerUsuarioPorId(id: number): Observable<Usuario> {
    return this.http.get<Usuario>(`${this.apiUrl}/${id}`, this.getHttpOptions())
      .pipe(
        tap(usuario => console.log('Usuario obtenido:', usuario)),
        catchError(this.handleError)
      );
  }
  crearUsuario(usuario: Usuario): Observable<ApiResponse> {
    const usuarioRequest = this.transformarUsuarioParaApi(usuario);    
    console.log('Creando usuario:', usuarioRequest);    
    return this.http.post<ApiResponse>(this.apiUrl, usuarioRequest, this.getHttpOptions())
      .pipe(
        tap(response => console.log('Usuario creado exitosamente:', response)),
        catchError(this.handleError)
      );
  }
  actualizarUsuario(usuario: Usuario): Observable<ApiResponse> {
    if (!usuario.noUsuario) {
      return throwError(() => new Error('ID de usuario requerido para actualizar'));
    }
    const usuarioRequest = this.transformarUsuarioParaApi(usuario);
    const url = `${this.apiUrl}/${usuario.noUsuario}`;    
    console.log('Actualizando usuario:', usuarioRequest);    
    return this.http.put<ApiResponse>(url, usuarioRequest, this.getHttpOptions())
      .pipe(
        tap(response => console.log('Usuario actualizado exitosamente:', response)),
        catchError(this.handleError)
      );
  }
  eliminarUsuario(id: number): Observable<ApiResponse> {
    return this.http.delete<ApiResponse>(`${this.apiUrl}/${id}`, this.getHttpOptions())
      .pipe(
        tap(response => console.log('Usuario eliminado:', response)),
        catchError(this.handleError)
      );
  }
  private transformarUsuarioParaApi(usuario: Usuario): UsuarioRequest {
    if (!usuario.identificacion?.trim()) {
      throw new Error('La identificación es requerida');
    }
    if (!usuario.nombres?.trim()) {
      throw new Error('Los nombres son requeridos');
    }
    if (!usuario.correoEmpresarial?.trim()) {
      throw new Error('El correo empresarial es requerido');
    }
    return {
      identificacion: usuario.identificacion.trim(),
      nombres: usuario.nombres.trim(),
      apellidos: usuario.apellidos?.trim() || '',
      usuario: usuario.usuario?.trim() || '',
      cargo: {
        idCargo: this.obtenerIdCargo(usuario.cargo || '')
      },
      correoEmpresarial: usuario.correoEmpresarial.trim(),
      correoPersonal: usuario.correoPersonal?.trim() || '',
      telefono1: usuario.celular?.trim() || '',
      telefono2: usuario.telefono?.trim() || '',
      direccion: usuario.direccion?.trim() || '',
      dobleAutenticacion: this.convertirDobleAutenticacion(usuario.dobleAutenticacion)
    };
  }
  private obtenerIdCargo(cargo: string): number {
    const cargoLimpio = cargo.trim();
    const idCargo = this.cargosMap[cargoLimpio];
    
    if (!idCargo) {
      console.warn(`Cargo no reconocido: "${cargoLimpio}". Usando cargo por defecto.`);
      return 1;
    }    
    return idCargo;
  }
  private convertirDobleAutenticacion(dobleAuth?: string): boolean {
    if (!dobleAuth) return false;    
    const valor = dobleAuth.trim().toLowerCase();
    return valor !== '' && valor !== 'ninguna' && valor !== 'false' && valor !== '0';
  }
  obtenerCargosDisponibles(): string[] {
    return Object.keys(this.cargosMap);
  }
  validarUsuarioExistente(identificacion: string, excludeId?: number): Observable<boolean> {
    let url = `${this.apiUrl}/validar/${encodeURIComponent(identificacion)}`;
    if (excludeId) {
      url += `?exclude=${excludeId}`;
    }    
    return this.http.get<boolean>(url, this.getHttpOptions())
      .pipe(
        catchError(() => throwError(() => new Error('Error al validar usuario existente')))
      );
  }
}