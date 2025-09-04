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
  idUsuario?: number;
  identificacion: string;
  nombres: string;
  apellidos: string;
  usuario: string;
  estado: string | { idEstado: number; descripcion: string; };
  activo: boolean;
  cargo?: string | number;
  cargoDescripcion?: string;
  rol?: { idRol: number; descripcion: string; };
  correoEmpresarial?: string;
  correoPersonal?: string;
  celular?: string;
  telefono?: string;
  direccion?: string;
  dobleAutenticacion?: string | null;
  fechaCreacion?: Date | string;
  fechaModificacion?: Date | string;
  ultimoAcceso?: Date | string;
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