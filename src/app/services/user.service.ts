import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { Observable, throwError, of } from 'rxjs';
import { catchError, map, switchMap } from 'rxjs/operators';
import { environment } from '../environments/environment';
import {
  Usuario,
  UsuarioRequest,
  ApiResponse,
  DobleAutenticacionTipo,
  ErrorResponse,
  PageResponse
} from '../interfaces/common.interfaces';

@Injectable({
  providedIn: 'root'
})
export class UserService {
  private readonly baseUrl = environment.apiUrl.endsWith('/')
    ? environment.apiUrl.slice(0, -1)
    : environment.apiUrl;
  private readonly apiUrl = `${this.baseUrl}/usuarios`;

  private readonly httpOptions = {
    headers: new HttpHeaders({
      'Content-Type': 'application/json',
    })
  };

  private readonly cargoMap: { [key: string]: number } = {
    'Gerente': 1,
    'Analista': 2,
    'Desarrollador': 3,
    'Administrador': 4,
    'Funcionario': 5
  };

  constructor(private http: HttpClient) {}

  obtenerCargosDisponibles(): Observable<string[]> {
    const cargos = ['Gerente', 'Analista', 'Desarrollador', 'Administrador', 'Funcionario'];
    return of(cargos);
  }

  obtenerUsuarios(): Observable<Usuario[]> {
    const normalize = (res: any): Usuario[] => {
      // Si es un array directo, devolverlo
      if (Array.isArray(res)) return res as Usuario[];

      // Si es un objeto Page (Spring Boot), extraer el content
      if (res && typeof res === 'object' && res.content && Array.isArray(res.content)) {
        return res.content as Usuario[];
      }

      // Soporte para otras estructuras comunes
      const data1 = res?.data ?? res;
      const data2 = data1?.data ?? data1;
      const list = data2?.usuarios ?? data2?.content ?? data2?.items ?? data2?.rows ?? data2?.results ?? data2?.list ?? data2;
      return Array.isArray(list) ? (list as Usuario[]) : [];
    };

    // Intentar obtener todos los usuarios con paginación grande
    const intento1$ = this.http.get<any>(this.apiUrl, {
      params: new HttpParams()
        .set('page', '0')
        .set('size', '1000')
        .set('sortBy', 'idUsuario')
        .set('sortDir', 'asc')
    }).pipe(
      map(normalize),
      catchError(() => of([] as Usuario[]))
    );

    // Fallback: intentar sin parámetros de paginación
    const intento2$ = () => this.http.get<any>(this.apiUrl).pipe(
      map(normalize),
      catchError(() => of([] as Usuario[]))
    );

    // Fallback final: endpoint alterno
    const intento3$ = () => this.http.get<any>(`${this.apiUrl}/activos`).pipe(
      map(normalize),
      catchError(() => of([] as Usuario[]))
    );

    return intento1$.pipe(
      switchMap(list => (list && list.length > 0) ? of(list) : intento2$()),
      switchMap(list => (list && list.length > 0) ? of(list) : intento3$()),
      catchError(this.handleError)
    );
  }

  obtenerUsuariosPaginados(page: number = 0, size: number = 10, sortBy: string = 'idUsuario', sortDir: string = 'asc'): Observable<PageResponse<Usuario>> {
    const params = new HttpParams()
      .set('page', page.toString())
      .set('size', size.toString())
      .set('sortBy', sortBy)
      .set('sortDir', sortDir);

    return this.http.get<any>(this.apiUrl, { params }).pipe(catchError(this.handleError));
  }

  obtenerUsuarioPorId(id: number): Observable<Usuario> {
    return this.http.get<Usuario>(`${this.apiUrl}/${id}`).pipe(catchError(this.handleError));
  }

  verificarUsuarioExiste(identificacion: string): Observable<boolean> {
    return this.http.get<Usuario[]>(`${this.apiUrl}/buscar?identificacion=${identificacion}`)
      .pipe(
        map(usuarios => usuarios.length > 0),
        catchError(() => of(false))
      );
  }

  crearUsuario(usuario: Usuario): Observable<ApiResponse> {
    const usuarioRequest: UsuarioRequest = this.transformarUsuarioParaApi(usuario);
    return this.http.post<ApiResponse>(this.apiUrl, usuarioRequest, this.httpOptions).pipe(catchError(this.handleError));
  }

  actualizarUsuario(usuario: Usuario): Observable<ApiResponse> {
    if (!usuario.noUsuario) {
      return throwError(() => new Error('ID de usuario requerido para actualización'));
    }
    const usuarioRequest: UsuarioRequest = this.transformarUsuarioParaApi(usuario);
    const url = `${this.apiUrl}/${usuario.noUsuario}`;
    return this.http.put<ApiResponse>(url, usuarioRequest, this.httpOptions).pipe(catchError(this.handleError));
  }

  eliminarUsuario(id: number): Observable<ApiResponse> {
    return this.http.delete<ApiResponse>(`${this.apiUrl}/${id}`)
      .pipe(
        catchError(this.handleError)
      );
  }

  desactivarUsuario(id: number): Observable<ApiResponse> {
    return this.http.patch<ApiResponse>(`${this.apiUrl}/${id}/desactivar`, {}, this.httpOptions)
      .pipe(catchError(this.handleError));
  }

  activarUsuario(id: number): Observable<ApiResponse> {
    return this.http.patch<ApiResponse>(`${this.apiUrl}/${id}/activar`, {}, this.httpOptions)
      .pipe(catchError(this.handleError));
  }

  validarPasswordActual(id: number, password: string): Observable<boolean> {
    return this.http.post<{valid: boolean}>(`${this.apiUrl}/${id}/validar-password`, { password }, this.httpOptions)
      .pipe(
        map(response => response.valid),
        catchError(() => of(false))
      );
  }

  cambiarPasswordUsuario(id: number, newPassword: string): Observable<ApiResponse> {
    return this.http.patch<ApiResponse>(`${this.apiUrl}/${id}/password`, { newPassword }, this.httpOptions)
      .pipe(catchError(this.handleError));
  }

  getDobleAutenticacionOpciones(): string[] {
    return Object.values(DobleAutenticacionTipo);
  }

  private transformarUsuarioParaApi(usuario: Usuario): UsuarioRequest {
    return {
      identificacion: usuario.identificacion?.trim() || '',
      nombres: usuario.nombres?.trim() || '',
      apellidos: usuario.apellidos?.trim() || '',
      usuario: usuario.usuario?.trim() || '',
      cargo: {
        // CORRECCIÓN: Usar el mapeo de cargos, por defecto Analista (ID: 2)
        idCargo: this.obtenerIdCargo(usuario.cargo?.descripcion ?? 'Analista')
      },
      correoEmpresarial: usuario.correoEmpresarial?.trim() || '',
      correoPersonal: usuario.correoPersonal?.trim() || '',
      telefono1: usuario.telefono1?.trim() || '',
      telefono2: usuario.telefono2?.trim() || '',
      direccion: usuario.direccion?.trim() || '',
      dobleAutenticacion: this.convertirDobleAutenticacion(usuario.dobleAutenticacion),
      perfiles: usuario.perfiles
    };
  }

  private obtenerIdCargo(cargo: string): number {
    // Por defecto devolver ID 2 (Analista)
    return this.cargoMap[cargo] || 2;
  }

  private convertirDobleAutenticacion(dobleAuth?: boolean | string): boolean {
    if (typeof dobleAuth === 'boolean') {
      return dobleAuth;
    }
    return dobleAuth !== null &&
           dobleAuth !== undefined &&
           dobleAuth !== '' &&
           Object.values(DobleAutenticacionTipo).includes(dobleAuth as DobleAutenticacionTipo);
  }

  private handleError = (error: HttpErrorResponse): Observable<never> => {
    let errorMessage = 'Error inesperado. Por favor, intenta más tarde.';

    if (error.error instanceof ErrorEvent) {
      errorMessage = `Error: ${error.error.message}`;
    } else {
      switch (error.status) {
        case 400:
          errorMessage = error.error?.message || 'Los datos enviados no son válidos. Por favor, revisa el formulario.';
          break;
        case 401:
          errorMessage = 'No tienes permisos para realizar esta operación.';
          break;
        case 404:
          errorMessage = 'El usuario no fue encontrado.';
          break;
        case 409:
          errorMessage = 'Ya existe un usuario con esta identificación o nombre de usuario.';
          break;
        case 422:
          errorMessage = 'Los datos proporcionados no cumplen con las validaciones requeridas.';
          break;
        case 500:
          errorMessage = 'Error interno del servidor. Por favor, intenta más tarde.';
          break;
        default:
          errorMessage = error.error?.message || errorMessage;
      }
    }
    return throwError(() => ({
      status: error.status,
      message: errorMessage,
      details: error.error?.details || [],
      timestamp: new Date().toISOString()
    }));
  }
}
