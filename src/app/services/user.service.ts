import { Injectable } from '@angular/core';
// import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Usuario } from '../pages/users/users';

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

// Esta interfaz define la respuesta que esperas del servidor
export interface ApiResponse {
  success: boolean;
  message: string;
  data?: any;
}

@Injectable({
  providedIn: 'root' // Esto hace que el servicio esté disponible en toda la aplicación
})
export class UserService {
  
  
  /*private apiUrl = '/api/usuarios';
  
  // HttpClient es la herramienta que Angular usa para hacer peticiones HTTP
  //constructor(private http: HttpClient) {}

  
  crearUsuario(usuario: Usuario): Observable<ApiResponse> {
    // Transformamos los datos del formulario al formato del JSON requerido
    const usuarioRequest: UsuarioRequest = this.transformarUsuarioParaApi(usuario);
    
    // Configuramos los headers (encabezados) de la petición
    //const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      // Si tu API requiere autenticación, agrégala aquí:
      // 'Authorization': 'Bearer ' + token
    });

    // Hacemos la petición POST al servidor
    return this.http.post<ApiResponse>(this.apiUrl, usuarioRequest, { headers });
  }

  actualizarUsuario(usuario: Usuario): Observable<ApiResponse> {
    const usuarioRequest: UsuarioRequest = this.transformarUsuarioParaApi(usuario);
    
    const headers = new HttpHeaders({
      'Content-Type': 'application/json'
    });

    // Para actualizar, usualmente se usa PUT y se incluye el ID en la URL
    const url = `${this.apiUrl}/${usuario.noUsuario}`;
    return this.http.put<ApiResponse>(url, usuarioRequest, { headers });
  }

  /**
   * MÉTODO PARA OBTENER TODOS LOS USUARIOS
   
  obtenerUsuarios(): Observable<Usuario[]> {
    return this.http.get<Usuario[]>(this.apiUrl);
  }

  /**
   * MÉTODO PARA OBTENER UN USUARIO POR ID
   
  obtenerUsuarioPorId(id: number): Observable<Usuario> {
    return this.http.get<Usuario>(`${this.apiUrl}/${id}`);
  }

  /**
   * MÉTODO PARA ELIMINAR UN USUARIO
   
  eliminarUsuario(id: number): Observable<ApiResponse> {
    return this.http.delete<ApiResponse>(`${this.apiUrl}/${id}`);
  }

  private transformarUsuarioParaApi(usuario: Usuario): UsuarioRequest {
    return {
      identificacion: usuario.identificacion,
      nombres: usuario.nombres,
      apellidos: usuario.apellidos,
      usuario: usuario.usuario,
      cargo: {
        // Aquí necesitas mapear el cargo a su ID
        // Si tu formulario solo tiene el nombre del cargo, necesitarás
        // otro método para obtener el ID del cargo
        idCargo: this.obtenerIdCargo(usuario.cargo ?? '')
      },
      correoEmpresarial: usuario.correoEmpresarial || '',
      correoPersonal: usuario.correoPersonal || '',
      telefono1: usuario.celular || '', // El celular del formulario va a telefono1
      telefono2: usuario.telefono || '', // El teléfono del formulario va a telefono2
      direccion: usuario.direccion || '',
      dobleAutenticacion: this.convertirDobleAutenticacion(usuario.dobleAutenticacion ? usuario.dobleAutenticacion : 'Google Authenticator')
    };
  }


  private obtenerIdCargo(cargo: string): number {
    // Esta es una implementación de ejemplo
    // Deberías reemplazarla con tu lógica real
    const cargos: { [key: string]: number } = {
      'Gerente': 1,
      'Analista': 2,
      'Desarrollador': 3,
      'Administrador': 4
      // Agrega más cargos según tu sistema
    };
    
    return cargos[cargo] || 1; // Retorna 1 por defecto si no encuentra el cargo
  }


  private convertirDobleAutenticacion(dobleAuth: string): boolean {
    // Si el usuario seleccionó alguna opción, consideramos que sí quiere doble autenticación
    return dobleAuth !== null && dobleAuth !== undefined && dobleAuth !== '';
  }
*/}