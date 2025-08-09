// src/app/interfaces/common.interfaces.ts

export interface Usuario {
  noUsuario: number;
  identificacion: string;
  nombres: string;
  apellidos: string;
  usuario: string;
  estado: string;
  activo: boolean;
  cargo?: string;
  correoEmpresarial?: string;
  correoPersonal?: string;
  celular?: string;
  telefono?: string;
  direccion?: string;
  dobleAutenticacion?: string;
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