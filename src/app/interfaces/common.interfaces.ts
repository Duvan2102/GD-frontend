// src/app/interfaces/common.interfaces.ts

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

export interface ApiResponse {
  success: boolean;
  message: string;
  data?: any;
}

export interface ErrorResponse {
  status: number;
  message: string;
  details?: string[];
  timestamp: string;
}

export enum DobleAutenticacionTipo {
  GOOGLE_AUTHENTICATOR = 'Google Authenticator',
  TOKEN_SEGURIDAD = 'Token de Seguridad'
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
