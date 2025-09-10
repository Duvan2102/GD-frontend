export enum DobleAutenticacionTipo {
  GOOGLE_AUTHENTICATOR = 'Google Authenticator',
  TOKEN_SEGURIDAD = 'Token de Seguridad'
}

export enum EstadoUsuario {
  ACTIVO = 'Activo',
  INACTIVO = 'Inactivo',
  SUSPENDIDO = 'Suspendido',
  PENDIENTE = 'Pendiente'
}

export interface Departamento {
  idDepartamento: number;
  descripcion: string;
}

export interface Area {
  idArea: number;
  descripcion: string;
  departamento: Departamento;
}

export interface Cargo {
  idCargo: number;
  descripcion: string;
  area: Area;
}

export interface Usuario {
  noUsuario?: number;
  idUsuario: number;
  identificacion: string;
  nombres: string;
  apellidos: string;
  usuario: string;
  estado: {
    idEstado: number;
    descripcion: string;
  };
  activo?: boolean;
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
  rol: {
    idRol: number;
    descripcion: string;
  };
  correoEmpresarial: string;
  correoPersonal?: string;
  telefono1: string;
  telefono2?: string;
  direccion?: string;
  dobleAutenticacion: boolean;
  perfiles?: {
    administrador: boolean;
    funcionarioCreador: boolean;
    funcionarios: boolean;
  };
}

export interface UsuarioRequest {
  identificacion: string;
  nombres: string;
  apellidos: string;
  usuario: string;
  cargo: {
    idCargo: number;
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
  correoPersonal?: string;
  telefono1: string;
  telefono2?: string;
  direccion?: string;
  dobleAutenticacion: boolean;
}

export interface ApiResponse {
  success: boolean;
  message: string;
  data?: any;
  errors?: string[];
  timestamp?: string;
}

export interface ErrorResponse {
  status: number;
  message: string;
  details?: string[];
  timestamp: string;
}

export interface UsuarioBusqueda {
  identificacion?: string;
  nombres?: string;
  apellidos?: string;
  usuario?: string;
  correoEmpresarial?: string;
  cargo?: string | number;
  estado?: string;
  activo?: boolean;
  departamento?: number;
  area?: number;
}

export interface PaginacionRequest {
  pagina: number;
  tamanoPagina: number;
  ordenPor?: string;
  direccion?: 'ASC' | 'DESC';
}

export interface PaginacionResponse<T> {
  contenido: T[];
  totalElementos: number;
  totalPaginas: number;
  paginaActual: number;
  tamanoPagina: number;
  esUltimaPagina: boolean;
  esPrimeraPagina: boolean;
}

export interface FiltrosUsuario {
  busqueda?: string;
  activos?: boolean;
  cargo?: string | number;
  departamento?: number;
  area?: number;
  fechaDesde?: Date;
  fechaHasta?: Date;
}

export interface EstadisticasUsuarios {
  totalUsuarios: number;
  usuariosActivos: number;
  usuariosInactivos: number;
  usuariosPorCargo: { [cargo: string]: number };
  usuariosPorDepartamento: { [departamento: string]: number };
  usuariosConDobleAuth: number;
  ultimosAccesos: {
    usuario: string;
    fechaAcceso: Date;
  }[];
}

export interface ConfiguracionTabla {
  columnas: string[];
  itemsPorPagina: number;
  ordenPor: string;
  direccionOrden: 'ASC' | 'DESC';
  mostrarInactivos: boolean;
}

export interface EventoTabla {
  tipo: 'editar' | 'eliminar' | 'inactivar' | 'activar' | 'cambiarContraseña' | 'eliminarQR' | 'ver';
  usuario: Usuario;
  datos?: any;
}

export interface ValidacionCampo {
  campo: string;
  requerido: boolean;
  tipoValidacion: 'email' | 'telefono' | 'texto' | 'numero' | 'fecha';
  longitudMinima?: number;
  longitudMaxima?: number;
  patron?: string;
  mensaje?: string;
}

export interface ConfiguracionApp {
  timeoutSesion: number;
  intentosMaximosLogin: number;
  longitudMinimaPassword: number;
  requiereDobleAuth: boolean;
  formatoFecha: string;
  formatoHora: string;
  idiomaDefault: string;
}

export interface RegistroAuditoria {
  id: number;
  usuario: string;
  accion: string;
  tabla: string;
  registroId: number;
  valoresAnteriores?: any;
  valoresNuevos?: any;
  fecha: Date;
  ip?: string;
  userAgent?: string;
}

export interface Notificacion {
  id: string;
  tipo: 'success' | 'error' | 'warning' | 'info';
  titulo: string;
  mensaje: string;
  duracion?: number;
  accion?: {
    texto: string;
    callback: () => void;
  };
  timestamp: Date;
}

export type EstadoCarga = 'idle' | 'loading' | 'success' | 'error';

export type AccionModal = 'crear' | 'editar' | 'eliminar' | 'inactivar' | 'activar' | 'cambiarContraseña' | 'eliminarQR' | 'ver';

export interface UsuarioAutenticado {
  id: number;
  usuario: string;
  nombres: string;
  apellidos: string;
  correo: string;
  cargo: string;
  permisos: string[];
  ultimoAcceso: Date;
  tokenExpiracion: Date;
}

export interface Permiso {
  id: number;
  codigo: string;
  descripcion: string;
  modulo: string;
  acciones: string[];
}

export interface Rol {
  id: number;
  nombre: string;
  descripcion: string;
  permisos: Permiso[];
  activo: boolean;
}

export interface Sesion {
  token: string;
  usuario: UsuarioAutenticado;
  fechaInicio: Date;
  fechaExpiracion: Date;
  activa: boolean;
}

// Interfaces para la autenticación con el backend
export interface LoginRequest {
  usuario: string;
  password: string;
}

export interface AuthResponse {
  token: string;
  usuario: UsuarioData;
}

export interface UsuarioData {
  idUsuario: number;
  identificacion: string;
  nombres: string;
  apellidos: string;
  usuario: string;
  correoEmpresarial: string;
  correoPersonal?: string;
  telefono1: string;
  telefono2?: string;
  direccion?: string;
  cargo: CargoData;
  rol: string;
  estado: string;
  tipologias: TipologiaData[];
}

export interface CargoData {
  idCargo: number;
  descripcion: string;
  area: string;
  departamento: string;
}

export interface TipologiaData {
  idTipologia: number;
  descripcion: string;
}

export interface AuthErrorResponse {
  code: string;
  message: string;
}

export interface MessageResponse {
  message: string;
}

// Interfaces para validación de contraseña
export interface PasswordValidationRequest {
  password: string;
}

export interface PasswordValidationResponse {
  valid: boolean;
  message: string;
}

export interface PageResponse<T> {
  content: T[];
  pageable: {
    sort: {
      sorted: boolean;
      unsorted: boolean;
      empty: boolean;
    };
    pageNumber: number;
    pageSize: number;
    offset: number;
    paged: boolean;
    unpaged: boolean;
  };
  totalElements: number;
  totalPages: number;
  last: boolean;
  first: boolean;
  size: number;
  number: number;
  numberOfElements: number;
  empty: boolean;
}

// Interfaces para el sistema de 2FA OBLIGATORIO
export interface TwoFARequest {
  codigo: string;
  tempToken?: string;
}

export interface TwoFAResponse {
  token: string;
  usuario: UsuarioData;
}

export interface TwoFAErrorResponse {
  code: 'CODIGO_2FA_INVALIDO' | 'TOKEN_INVALIDO' | 'USUARIO_BLOQUEADO' | 'CREDENCIALES_INVALIDAS' | '2FA_YA_CONFIGURADO' | '2FA_DISABLED' | 'PASSWORD_INCORRECT' | 'CODIGO_INVALIDO';
  message: string;
}

// Respuesta SIEMPRE después del login exitoso (nueva estructura)
export interface TwoFARequiredResponse {
  message: string;
  usuario: string;
  dobleAutenticacion: boolean;
  tempToken: string;
}

// Verificar estado de configuración 2FA (actualizada)
export interface TwoFAStatusResponse {
  hasGoogleAuth: boolean;
  hasEmailBackup: boolean;
  googleAuthPending: boolean;
  message: string;
}

// Obtener/Regenerar código QR
export interface QRCodeResponse {
  qrCodeUrl: string;
  secret: string;
  message: string;
}

// Configurar Google Authenticator (primera vez)
export interface GoogleAuthSetupResponse {
  qrCodeUrl: string;
  secret: string;
  message: string;
}

export interface GoogleAuthConfirmRequest {
  usuario: string;
  secret: string;
  codigo: string;
}

export interface GoogleAuthConfirmResponse {
  message: string;
}

// Desvincular Google Authenticator
export interface UnlinkGoogleAuthRequest {
  usuario: string;
  password: string;
}

export interface UnlinkGoogleAuthResponse {
  message: string;
}

// Envío de código por email (respaldo)
export interface EmailCodeRequest {
  usuario: string;
}

export interface EmailCodeResponse {
  message: string;
}

// Estados de 2FA (actualizada)
export interface TwoFAState {
  hasGoogleAuth: boolean;
  hasEmailBackup: boolean;
  googleAuthPending: boolean;
  isConfigured: boolean;
  needsSetup: boolean;
  metodoActual?: 'GOOGLE_AUTH' | 'EMAIL';
}

// Datos de configuración QR
export interface QRSetupData {
  qrCodeUrl: string;
  secret: string;
  isNew: boolean;
  message: string;
}

// Cambio de método 2FA por administrador (actualizada)
export interface Change2FAMethodRequest {
  idUsuario: number;
  nuevoMetodo: 'EMAIL' | 'GOOGLE_AUTH';
}

export interface Change2FAMethodResponse {
  success: boolean;
  message: string;
  qrCodeUrl?: string;
  secret?: string;
  nuevoMetodo: 'GOOGLE_AUTH' | 'EMAIL';
}
