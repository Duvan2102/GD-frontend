import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { environment } from '../environments/environment';
import { PositionService, Position } from '../services/positions.service';
import { 
  Usuario, 
  UsuarioRequest, 
  ApiResponse, 
  DobleAutenticacionTipo,
  ErrorResponse 
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
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization'
    })
  };

  constructor(
    private http: HttpClient,
    private positionService: PositionService
  ) {}
  
  obtenerCargosDisponibles(): Observable<Position[]> {
    return this.positionService.getAll().pipe(
      catchError((error) => {
        console.warn('Error obteniendo cargos del backend, usando fallback:', error);
        const cargosFallback: Position[] = [
          { 
            idCargo: 1, 
            descripcion: 'Gerente', 
            area: { 
              idArea: 1, 
              descripcion: 'Gerencia', 
              departamento: { idDepartamento: 1, descripcion: 'Administración' } 
            } 
          },
          { 
            idCargo: 2, 
            descripcion: 'Analista', 
            area: { 
              idArea: 2, 
              descripcion: 'Análisis', 
              departamento: { idDepartamento: 1, descripcion: 'Administración' } 
            } 
          },
          { 
            idCargo: 3, 
            descripcion: 'Desarrollador', 
            area: { 
              idArea: 3, 
              descripcion: 'Desarrollo', 
              departamento: { idDepartamento: 2, descripcion: 'Tecnología' } 
            } 
          },
          { 
            idCargo: 4, 
            descripcion: 'Administrador', 
            area: { 
              idArea: 4, 
              descripcion: 'Administración', 
              departamento: { idDepartamento: 1, descripcion: 'Administración' } 
            } 
          },
          { 
            idCargo: 5, 
            descripcion: 'Funcionario', 
            area: { 
              idArea: 5, 
              descripcion: 'General', 
              departamento: { idDepartamento: 1, descripcion: 'Administración' } 
            } 
          }
        ];
        return of(cargosFallback);
      })
    );
  }

  obtenerCargoPorId(id: number): Observable<Position> {
    return this.positionService.getById(id).pipe(
      catchError((error) => {
        console.warn(`Error obteniendo cargo con ID ${id}:`, error);
        const cargoDefault: Position = {
          idCargo: id,
          descripcion: 'Cargo no encontrado',
          area: {
            idArea: 1,
            descripcion: 'Sin área',
            departamento: { idDepartamento: 1, descripcion: 'Sin departamento' }
          }
        };
        return of(cargoDefault);
      })
    );
  }

  obtenerUsuarios(): Observable<Usuario[]> {
    return this.http.get<Usuario[]>(this.apiUrl).pipe(
      map(usuarios => this.procesarUsuariosRecibidos(usuarios)),
      catchError(this.handleError)
    );
  }

  obtenerUsuarioPorId(id: number): Observable<Usuario> {
  return this.http.get<Usuario>(`${this.apiUrl}/${id}`).pipe(
    map(usuario => this.procesarUsuarioRecibido(usuario, 0)),
    catchError(this.handleError)
  );
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
    return this.http.post<ApiResponse>(this.apiUrl, usuarioRequest, this.httpOptions).pipe(
      catchError(this.handleError)
    );
  }

  actualizarUsuario(usuario: Usuario): Observable<ApiResponse> {
  const userId = usuario['noUsuario'] || usuario.noUsuario;
  if (!userId) {
    return throwError(() => new Error('ID de usuario requerido para actualización'));
  }
  const usuarioRequest: UsuarioRequest = this.transformarUsuarioParaApi(usuario);
  const url = `${this.apiUrl}/${userId}`;
  return this.http.put<ApiResponse>(url, usuarioRequest, this.httpOptions).pipe(
    catchError(this.handleError)
  );
}

  eliminarUsuario(id: number): Observable<ApiResponse> {
    return this.http.delete<ApiResponse>(`${this.apiUrl}/${id}`).pipe(
      catchError(this.handleError)
    );
  }

  getDobleAutenticacionOpciones(): string[] {
    return Object.values(DobleAutenticacionTipo);
  }

  buscarUsuarios(criterios: Partial<Usuario>): Observable<Usuario[]> {
    const params = new URLSearchParams();
    
    Object.entries(criterios).forEach(([key, value]) => {
      if (value !== null && value !== undefined && value !== '') {
        params.append(key, value.toString());
      }
    });

    return this.http.get<Usuario[]>(`${this.apiUrl}/buscar?${params}`).pipe(
      map(usuarios => this.procesarUsuariosRecibidos(usuarios)),
      catchError(this.handleError)
    );
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

  return {
    ...usuario,
    idUsuario: usuario.idUsuario,
    noUsuario: usuario.idUsuario || usuario.noUsuario || (index !== undefined ? index + 1 : 0),
    cargo: cargoId || cargoDescripcion,
    cargoDescripcion: cargoDescripcion,
    estado: typeof usuario.estado === 'object' ? usuario.estado.descripcion : (usuario.estado || 'ACTIVO'),
    activo: typeof usuario.estado === 'object' ? usuario.estado.descripcion === 'ACTIVO' : (usuario.activo !== false),
    rol: usuario.rol || { idRol: 2, descripcion: 'USUARIO' },
    correoEmpresarial: usuario.correoEmpresarial || '',
    celular: usuario.telefono1 || usuario.celular || '',
    telefono: usuario.telefono2 || usuario.telefono || '',
    direccion: usuario.direccion || '',
    correoPersonal: usuario.correoPersonal || '',
    dobleAutenticacion: typeof usuario.dobleAutenticacion === 'boolean' 
      ? (usuario.dobleAutenticacion ? 'Google Authenticator' : '') 
      : (usuario.dobleAutenticacion || 'Google Authenticator')
  };
}

  private transformarUsuarioParaApi(usuario: Usuario): UsuarioRequest {
  return {
    identificacion: usuario.identificacion?.trim() || '',
    nombres: usuario.nombres?.trim() || '',
    apellidos: usuario.apellidos?.trim() || '',
    usuario: usuario.usuario?.trim() || '',
    cargo: {
      idCargo: this.obtenerIdCargo(usuario.cargo)
    },
    estado: typeof usuario.estado === 'object' 
      ? usuario.estado 
      : { idEstado: 5, descripcion: 'ACTIVO' },
    rol: {
      idRol: 2,
      descripcion: 'USUARIO'
    },
    correoEmpresarial: usuario.correoEmpresarial?.trim() || '',
    correoPersonal: usuario.correoPersonal?.trim() || '',
    telefono1: usuario.celular?.trim() || '',
    telefono2: usuario.telefono?.trim() || '',
    direccion: usuario.direccion?.trim() || '',
    dobleAutenticacion: this.convertirDobleAutenticacion(usuario.dobleAutenticacion)
  };
  }

  private obtenerIdCargo(cargo: string | number | undefined): number {
    if (typeof cargo === 'number') {
      return cargo;
    }
    
    if (typeof cargo === 'string') {
      const cargoNumerico = parseInt(cargo, 10);
      if (!isNaN(cargoNumerico)) {
        return cargoNumerico;
      }
      
      const cargoMapFallback: { [key: string]: number } = {
        'Gerente': 1,
        'Analista': 2,
        'Desarrollador': 3,
        'Administrador': 4,
        'Funcionario': 5
      };
      
      return cargoMapFallback[cargo] || 2;
    }
    
    return 2;
  }
  
  private convertirDobleAutenticacion(dobleAuth?: string | null): boolean {
    return dobleAuth !== null && 
           dobleAuth !== undefined && 
           dobleAuth !== '' && 
           Object.values(DobleAutenticacionTipo).includes(dobleAuth as DobleAutenticacionTipo);
  }
  
  private handleError = (error: HttpErrorResponse): Observable<never> => {
    let errorMessage = 'Error inesperado. Por favor, intenta más tarde.';
    
    if (error.error instanceof ErrorEvent) {
      errorMessage = `Error de conexión: ${error.error.message}`;
    } else {
      // Error del lado del servidor
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
    
    return throwError(() => ({
      status: error.status,
      message: errorMessage,
      details: error.error?.details || [],
      timestamp: new Date().toISOString()
    }));
  }
}