import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { Observable, throwError, of } from 'rxjs';
import { catchError, map, switchMap, shareReplay, tap } from 'rxjs/operators';
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
      if (Array.isArray(res)) {
        return this.procesarUsuariosRecibidos(res as any[]);
      }

      if (res && typeof res === 'object' && res.content && Array.isArray(res.content)) {
        return this.procesarUsuariosRecibidos(res.content as any[]);
      }

      const data1 = res?.data ?? res;
      const data2 = data1?.data ?? data1;
      const list = data2?.usuarios ?? data2?.content ?? data2?.items ?? data2?.rows ?? data2?.results ?? data2?.list ?? data2;
      return Array.isArray(list) ? this.procesarUsuariosRecibidos(list as any[]) : [];
    };

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
      catchError(this.handleError),
      shareReplay(1) // Evitar múltiples llamadas HTTP para el mismo endpoint
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
    return this.http.get<Usuario>(`${this.apiUrl}/${id}`).pipe(
      map(usuario => this.procesarUsuarioRecibido(usuario, 0)),
      catchError(this.handleError)
    );
  }

  verificarUsuarioExiste(identificacion: string): Observable<boolean> {
    return this.http.post<Usuario[]>(`${this.apiUrl}/buscar`, { identificacion: identificacion }, this.httpOptions)
      .pipe(
        map(usuarios => usuarios.length > 0),
        catchError(() => of(false))
      );
  }

  crearUsuario(usuario: Usuario): Observable<ApiResponse> {
    const usuarioRequest: UsuarioRequest = this.transformarUsuarioParaApi(usuario);
    console.log('=== CREAR USUARIO - DEBUG ===');
    console.log('URL:', this.apiUrl);
    console.log('Headers:', this.httpOptions.headers);
    console.log('Datos enviados:', JSON.stringify(usuarioRequest, null, 2));
    console.log('============================');
    return this.http.post<ApiResponse>(this.apiUrl, usuarioRequest, this.httpOptions).pipe(
      catchError(this.handleError)
    );
  }

  actualizarUsuario(usuario: Usuario): Observable<ApiResponse> {
    const userId = usuario.idUsuario || usuario.noUsuario;
    if (!userId) {
      return throwError(() => new Error('ID de usuario requerido para actualización'));
    }

    if (!usuario.identificacion || !usuario.nombres || !usuario.apellidos || !usuario.usuario || !usuario.correoEmpresarial) {
      return throwError(() => new Error('Datos requeridos faltantes para la actualización'));
    }

    const usuarioRequest: UsuarioRequest = this.transformarUsuarioParaApi(usuario);

    const camposRequeridos = ['identificacion', 'nombres', 'apellidos', 'usuario', 'correoEmpresarial'];
    const camposFaltantes = camposRequeridos.filter(campo => !usuarioRequest[campo as keyof UsuarioRequest]);
    
    if (camposFaltantes.length > 0) {
      return throwError(() => new Error(`Campos requeridos faltantes: ${camposFaltantes.join(', ')}`));
    }

    const url = `${this.apiUrl}/${userId}`;
    
    // RECREAR headers cada vez para asegurar que se envíen correctamente
    const headers = new HttpHeaders({
      'Content-Type': 'application/json'
    });
    
    const options = {
      headers: headers
    };
    
    console.log('=== ACTUALIZAR USUARIO - DEBUG ===');
    console.log('URL:', url);
    console.log('Headers (keys):', headers.keys());
    console.log('Content-Type:', headers.get('Content-Type'));
    console.log('Datos enviados:', JSON.stringify(usuarioRequest, null, 2));
    console.log('==================================');
    
    return this.http.put<any>(url, usuarioRequest, options).pipe(
      tap((response: any) => {
        console.log('=== RESPUESTA DEL SERVIDOR (ACTUALIZAR) ===');
        console.log('Status: SUCCESS');
        console.log('Response:', JSON.stringify(response, null, 2));
        console.log('===========================================');
      }),
      map((response: any): ApiResponse => {
        if (response && response.idUsuario) {
          return {
            success: true,
            message: 'Usuario actualizado correctamente',
            data: response
          };
        }

        if (response && typeof response.success !== 'undefined') {
          return response;
        }

        return {
          success: true,
          message: 'Usuario actualizado correctamente',
          data: response
        };
      }),
      catchError((error: HttpErrorResponse) => {
        console.error('=== ERROR DEL SERVIDOR (ACTUALIZAR) ===');
        console.error('Status:', error.status);
        console.error('StatusText:', error.statusText);
        console.error('Error body:', error.error);
        console.error('Full error:', error);
        console.error('=======================================');
        return this.handleError(error);
      })
    );
  }

  eliminarUsuario(id: number): Observable<ApiResponse> {
    return this.http.delete<ApiResponse>(`${this.apiUrl}/${id}`).pipe(
      catchError(this.handleError)
    );
  }

  desactivarUsuario(usuario: Usuario, password: string): Observable<ApiResponse> {
    const userId = usuario.idUsuario || usuario.noUsuario;
    if (!userId) {
      return throwError(() => new Error('ID de usuario requerido'));
    }
    const usuarioRequest = { password };
    const url = `${this.apiUrl}/${userId}/desactivar`;
    console.log('=== DESACTIVAR USUARIO - DEBUG ===');
    console.log('URL:', url);
    console.log('Headers:', this.httpOptions.headers);
    console.log('Datos enviados:', JSON.stringify(usuarioRequest, null, 2));
    console.log('==================================');
    return this.http.put<ApiResponse>(url, usuarioRequest, this.httpOptions)
      .pipe(
        map(response => {
          console.log('✓ Desactivación exitosa:', response);
          return response;
        }),
        catchError(error => {
          console.error('✗ Error en desactivación:', error);
          return this.handleError(error);
        })
      );
  }

  activarUsuario(usuario: Usuario, password: string): Observable<ApiResponse> {
    const userId = usuario.idUsuario || usuario.noUsuario;
    if (!userId) {
      return throwError(() => new Error('ID de usuario requerido'));
    }
    const usuarioRequest = { password };
    const url = `${this.apiUrl}/${userId}/activar`;
    console.log('=== ACTIVAR USUARIO - DEBUG ===');
    console.log('URL:', url);
    console.log('Headers:', this.httpOptions.headers);
    console.log('Datos enviados:', JSON.stringify(usuarioRequest, null, 2));
    console.log('===============================');
    return this.http.put<ApiResponse>(url, usuarioRequest, this.httpOptions)
      .pipe(
        map(response => {
          console.log('✓ Activación exitosa:', response);
          return response;
        }),
        catchError(error => {
          console.error('✗ Error en activación:', error);
          return this.handleError(error);
        })
      );
  }

  validarPasswordActual(id: number, password: string): Observable<boolean> {
    return this.http.post<{valid: boolean}>(`${this.apiUrl}/${id}/validar-password`, { password }, this.httpOptions)
      .pipe(
        map(response => response.valid),
        catchError(() => of(false))
      );
  }

  cambiarPasswordUsuario(id: number, nuevaPassword: string): Observable<ApiResponse> {
    return this.http.put<ApiResponse>(`${this.apiUrl}/${id}/password`, { nuevaPassword }, this.httpOptions)
      .pipe(catchError(this.handleError));
  }

  getDobleAutenticacionOpciones(): string[] {
    return Object.values(DobleAutenticacionTipo);
  }

  private transformarUsuarioParaApi(usuario: Usuario): UsuarioRequest & { idUsuario?: number } {
    // El cargo, rol y estado deben venir ya con toda su estructura del componente
    if (!usuario.cargo) {
      throw new Error('Cargo requerido');
    }

    // Extraer solo el idRol del objeto rol
    const rolId = usuario.rol?.idRol || 2; // Default a FUNCIONARIO si no hay rol

    const result: any = {
      identificacion: usuario.identificacion?.trim() || '',
      nombres: usuario.nombres?.trim() || '',
      apellidos: usuario.apellidos?.trim() || '',
      usuario: usuario.usuario?.trim() || '',
      cargo: usuario.cargo,  // Ya viene con estructura completa desde el componente
      estado: usuario.estado,  // Ya viene con estructura completa
      rol: { idRol: rolId },  // Enviar solo el idRol
      correoEmpresarial: usuario.correoEmpresarial?.trim() || '',
      correoPersonal: usuario.correoPersonal?.trim() || '',
      telefono1: this.cleanPhoneNumber(usuario.telefono1?.trim() || ''),
      telefono2: this.cleanPhoneNumber(usuario.telefono2?.trim() || ''),
      direccion: usuario.direccion?.trim() || '',
      dobleAutenticacion: typeof usuario.dobleAutenticacion === 'boolean'
        ? usuario.dobleAutenticacion
        : usuario.dobleAutenticacion === 'GOOGLE_AUTH' || usuario.dobleAutenticacion === 'EMAIL'
    };

    if (usuario.idUsuario) {
      result.idUsuario = usuario.idUsuario;
    }

    console.log('DEBUG: transformarUsuarioParaApi resultado:', JSON.stringify(result, null, 2));
    console.log('DEBUG: Rol enviado - idRol:', rolId);
    
    return result;
  }

  private procesarUsuariosRecibidos(usuarios: any[]): Usuario[] {
    return usuarios.map((usuario, index) => this.procesarUsuarioRecibido(usuario, index));
  }

  private procesarUsuarioRecibido(usuario: any, index?: number): Usuario {
    let cargoDescripcion = '';
    let cargoId: string | number = '';

    if (usuario.cargo) {
      if (typeof usuario.cargo === 'object') {
        cargoId = usuario.cargo.idCargo || '';
        cargoDescripcion = usuario.cargo.descripcion || '';
      } else if (typeof usuario.cargo === 'string' || typeof usuario.cargo === 'number') {
        cargoDescripcion = usuario.cargo.toString();
        cargoId = usuario.cargo;
      }
    }

    let estadoActivo = false;
    let estadoDescripcion = '';
    
    if (typeof usuario.estado === 'object' && usuario.estado && usuario.estado.descripcion) {
      estadoDescripcion = String(usuario.estado.descripcion).trim().toUpperCase();
      estadoActivo = estadoDescripcion === 'ACTIVO';
    } else if (usuario.estado && typeof usuario.estado === 'string') {
      estadoDescripcion = String(usuario.estado).trim().toUpperCase();
      estadoActivo = estadoDescripcion === 'ACTIVO';
    } else if (usuario.estado && typeof usuario.estado === 'number') {
      estadoActivo = usuario.estado === 1 || usuario.estado === 5;
      estadoDescripcion = estadoActivo ? 'ACTIVO' : 'INACTIVO';
    } else {
      estadoDescripcion = 'ACTIVO';
      estadoActivo = true;
    }

    return {
      ...usuario,
      idUsuario: usuario.idUsuario,
      noUsuario: usuario.idUsuario || usuario.noUsuario || (index !== undefined ? index + 1 : 0),
      cargo: cargoId || cargoDescripcion,
      cargoDescripcion: cargoDescripcion,
      estado: typeof usuario.estado === 'object' ? usuario.estado : { descripcion: estadoDescripcion },
      activo: estadoActivo,
      rol: usuario.rol || { idRol: 2, descripcion: 'USUARIO' },
      correoEmpresarial: usuario.correoEmpresarial || '',
      celular: usuario.telefono1 || usuario.celular || '',
      telefono: usuario.telefono2 || usuario.telefono || '',
      direccion: usuario.direccion || '',
      correoPersonal: usuario.correoPersonal || '',
      dobleAutenticacion: typeof usuario.dobleAutenticacion === 'boolean'
        ? (usuario.dobleAutenticacion ? 'GOOGLE_AUTH' : 'EMAIL')
        : (usuario.dobleAutenticacion || null)
    };
  }

  private obtenerIdCargo(cargo: any): { idCargo: number } | null {
    // Si cargo ya es un objeto con idCargo, devolverlo tal cual
    if (cargo && typeof cargo === 'object' && cargo.idCargo) {
      return { idCargo: cargo.idCargo };
    }

    // Si cargo es un número, envolver en objeto
    if (typeof cargo === 'number') {
      return { idCargo: cargo };
    }

    // Si cargo es string numérico, convertir y envolver
    if (typeof cargo === 'string') {
      const cargoNumerico = parseInt(cargo, 10);
      if (!isNaN(cargoNumerico)) {
        return { idCargo: cargoNumerico };
      }
    }

    console.error('No se pudo obtener ID de cargo válido:', cargo);
    return null;
  }

  private convertirDobleAutenticacion(dobleAuth: boolean | string | undefined): boolean {
    if (typeof dobleAuth === 'boolean') {
      return dobleAuth;
    }
    if (typeof dobleAuth === 'string') {
      return dobleAuth.toLowerCase() === 'true' || dobleAuth === '1';
    }
    return false;
  }

  private cleanPhoneNumber(phone: string): string {
    return phone.replace(/[\s\-()]/g, '');
  }

  private handleError = (error: HttpErrorResponse): Observable<never> => {
    let errorMessage = 'Error inesperado. Por favor, intenta más tarde.';

    if (error.error instanceof ErrorEvent) {
      errorMessage = `Error de conexión: ${error.error.message}`;
    } else {
      switch (error.status) {
        case 0:
          errorMessage = 'No se pudo conectar con el servidor. Verifica tu conexión a internet.';
          break;
        case 400:
          errorMessage = error.error?.message || 'Los datos enviados no son válidos. Por favor, revisa el formulario.';
          break;
        case 401:
          errorMessage = 'No tienes permisos para realizar esta operación.';
          break;
        case 403:
          errorMessage = 'Acceso denegado. No tienes los permisos necesarios.';
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
        case 503:
          errorMessage = 'El servicio no está disponible temporalmente. Intenta más tarde.';
          break;
        default:
          errorMessage = error.error?.message || `Error del servidor (${error.status}). Intenta más tarde.`;
      }
    }

    console.error('Error en UserService:', {
      status: error.status,
      message: errorMessage,
      error: error.error,
      url: error.url
    });

    return throwError(() => error);
  }
}