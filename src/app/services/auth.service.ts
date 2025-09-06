import { Injectable } from '@angular/core';
import { Observable, of, BehaviorSubject, throwError } from 'rxjs';
import { HttpClient } from '@angular/common/http';
import { map, catchError } from 'rxjs/operators';
import { Usuario, LoginRequest, AuthResponse, UsuarioData, AuthErrorResponse, MessageResponse, PasswordValidationRequest, PasswordValidationResponse } from '../interfaces/common.interfaces';
import { Position } from './positions.service';
import { environment } from '../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private apiUrl = environment.apiUrl;
  private tokenKey = 'auth_token';

  private currentUserSubject = new BehaviorSubject<UsuarioData | null>(null);
  private currentUser: UsuarioData | null = null;

  // Datos mock para desarrollo (se mantienen como respaldo)
  private mockUsers: any[] = [
    {
      idUsuario: 2,
      identificacion: '1234567802',
      nombres: 'Nombre2',
      apellidos: 'Apellido2',
      usuario: 'usuario2',
      estado: {
        idEstado: 1,
        descripcion: 'ACTIVO'
      },
      activo: true,
      cargo: {
        idCargo: 5,
        descripcion: 'Contador',
        area: {
          idArea: 1,
          descripcion: 'Desarrollo',
          departamento: {
            idDepartamento: 1,
            descripcion: 'Tecnología'
          }
        }
      },
      rol: {
        idRol: 1,
        descripcion: 'ADMINISTRADOR'
      },
      correoEmpresarial: 'usuario2@empresa.com',
      telefono1: '3001234567',
      direccion: 'Calle 123',
      dobleAutenticacion: true,
      cargoCompleto: {
        idCargo: 5,
        descripcion: 'Contador',
        area: {
          idArea: 1,
          descripcion: 'Desarrollo',
          departamento: {
            idDepartamento: 1,
            descripcion: 'Tecnología'
          }
        },
        permisos: {
          esAdministrador: true,
          esAuditor: true
        }
      }
    },
    {
      noUsuario: 3,
      identificacion: '12065894',
      nombres: 'Luisga',
      apellidos: 'Perez Cabrales',
      usuario: 'luis.perez',
      estado: {
        idEstado: 1,
        descripcion: 'ACTIVO'
      },
      activo: true,
      cargo: {
        idCargo: 1,
        descripcion: 'Analista de Desarrollo',
        area: {
          idArea: 1,
          descripcion: 'Desarrollo',
          departamento: {
            idDepartamento: 1,
            descripcion: 'Tecnología'
          }
        }
      },
      rol: {
        idRol: 2,
        descripcion: 'USUARIO'
      },
      cargoCompleto: {
        idCargo: 1,
        descripcion: 'Analista de Desarrollo',
        area: {
          idArea: 7,
          descripcion: 'Alplicaciones internas',
          departamento: {
            idDepartamento: 1,
            descripcion: 'Tecnología'
          }
        },
        permisos: {
          esAdministrador: false,
          esAuditor: false
        }
      }
    },
    {
      noUsuario: 4,
      identificacion: '1120658749',
      nombres: 'Luis Gabriel',
      apellidos: 'Perez Cabrales',
      usuario: 'luis.perez1',
      estado: {
        idEstado: 1,
        descripcion: 'ACTIVO'
      },
      activo: true,
      cargo: {
        idCargo: 1,
        descripcion: 'Analista de Desarrollo',
        area: {
          idArea: 1,
          descripcion: 'Desarrollo',
          departamento: {
            idDepartamento: 1,
            descripcion: 'Tecnología'
          }
        }
      },
      rol: {
        idRol: 2,
        descripcion: 'USUARIO'
      },
      cargoCompleto: {
        idCargo: 1,
        descripcion: 'Analista de Desarrollo',
        area: {
          idArea: 7,
          descripcion: 'Alplicaciones internas',
          departamento: {
            idDepartamento: 1,
            descripcion: 'Tecnología'
          }
        },
        permisos: {
          esAdministrador: false,
          esAuditor: false
        }
      }
    },
    {
      noUsuario: 5,
      identificacion: '1065824170',
      nombres: 'Luis',
      apellidos: 'Gabriel Perez',
      usuario: 'lucho.gabriel',
      estado: {
        idEstado: 1,
        descripcion: 'ACTIVO'
      },
      activo: true,
      cargo: {
        idCargo: 1,
        descripcion: 'Analista de Desarrollo',
        area: {
          idArea: 1,
          descripcion: 'Desarrollo',
          departamento: {
            idDepartamento: 1,
            descripcion: 'Tecnología'
          }
        }
      },
      rol: {
        idRol: 2,
        descripcion: 'USUARIO'
      },
      cargoCompleto: {
        idCargo: 1,
        descripcion: 'Analista de Desarrollo',
        area: {
          idArea: 7,
          descripcion: 'Alplicaciones internas',
          departamento: {
            idDepartamento: 1,
            descripcion: 'Tecnología'
          }
        },
        permisos: {
          esAdministrador: false,
          esAuditor: false
        }
      }
    },
    {
      noUsuario: 6,
      identificacion: '12345678920',
      nombres: 'Juan Carlos',
      apellidos: 'Pérez González',
      usuario: 'jpere3z',
      estado: {
        idEstado: 1,
        descripcion: 'ACTIVO'
      },
      activo: true,
      cargo: {
        idCargo: 1,
        descripcion: 'Analista de Desarrollo',
        area: {
          idArea: 1,
          descripcion: 'Desarrollo',
          departamento: {
            idDepartamento: 1,
            descripcion: 'Tecnología'
          }
        }
      },
      rol: {
        idRol: 2,
        descripcion: 'USUARIO'
      },
      cargoCompleto: {
        idCargo: 1,
        descripcion: 'Analista de Desarrollo',
        area: {
          idArea: 7,
          descripcion: 'Alplicaciones internas',
          departamento: {
            idDepartamento: 1,
            descripcion: 'Tecnología'
          }
        },
        permisos: {
          esAdministrador: false,
          esAuditor: false
        }
      }
    },
    {
      noUsuario: 7,
      identificacion: '1120748054',
      nombres: 'Luisa',
      apellidos: 'Perez Cabrales',
      usuario: 'luisa.perez',
      estado: {
        idEstado: 1,
        descripcion: 'ACTIVO'
      },
      activo: true,
      cargo: {
        idCargo: 1,
        descripcion: 'Analista de Desarrollo',
        area: {
          idArea: 1,
          descripcion: 'Desarrollo',
          departamento: {
            idDepartamento: 1,
            descripcion: 'Tecnología'
          }
        }
      },
      rol: {
        idRol: 2,
        descripcion: 'USUARIO'
      },
      cargoCompleto: {
        idCargo: 1,
        descripcion: 'Analista de Desarrollo',
        area: {
          idArea: 7,
          descripcion: 'Alplicaciones internas',
          departamento: {
            idDepartamento: 1,
            descripcion: 'Tecnología'
          }
        },
        permisos: {
          esAdministrador: false,
          esAuditor: false
        }
      }
    },
    {
      noUsuario: 8,
      identificacion: '1001065621',
      nombres: 'Brayan',
      apellidos: 'Aranda',
      usuario: 'brayan.aranda',
      estado: {
        idEstado: 1,
        descripcion: 'ACTIVO'
      },
      activo: true,
      cargo: {
        idCargo: 1,
        descripcion: 'Analista de Desarrollo',
        area: {
          idArea: 1,
          descripcion: 'Desarrollo',
          departamento: {
            idDepartamento: 1,
            descripcion: 'Tecnología'
          }
        }
      },
      rol: {
        idRol: 2,
        descripcion: 'USUARIO'
      },
      cargoCompleto: {
        idCargo: 1,
        descripcion: 'Analista de Desarrollo',
        area: {
          idArea: 7,
          descripcion: 'Alplicaciones internas',
          departamento: {
            idDepartamento: 1,
            descripcion: 'Tecnología'
          }
        },
        permisos: {
          esAdministrador: false,
          esAuditor: false
        }
      }
    },
    {
      noUsuario: 9,
      identificacion: '40912127',
      nombres: 'maria paula',
      apellidos: 'suarez',
      usuario: 'maria.suarez',
      estado: {
        idEstado: 1,
        descripcion: 'ACTIVO'
      },
      activo: true,
      cargo: {
        idCargo: 2,
        descripcion: 'Desarrollador Senior',
        area: {
          idArea: 1,
          descripcion: 'Desarrollo',
          departamento: {
            idDepartamento: 1,
            descripcion: 'Tecnología'
          }
        }
      },
      rol: {
        idRol: 2,
        descripcion: 'USUARIO'
      },
      cargoCompleto: {
        idCargo: 2,
        descripcion: 'Desarrollador Senior',
        area: {
          idArea: 1,
          descripcion: 'Desarrollo',
          departamento: {
            idDepartamento: 1,
            descripcion: 'Tecnología'
          }
        },
        permisos: {
          esAdministrador: false,
          esAuditor: false
        }
      }
    },
    {
      noUsuario: 10,
      identificacion: '10203040',
      nombres: 'No lo se Rick',
      apellidos: 'Parece Falso',
      usuario: 'no.parece',
      estado: {
        idEstado: 1,
        descripcion: 'ACTIVO'
      },
      activo: true,
      cargo: {
        idCargo: 1,
        descripcion: 'Analista de Desarrollo',
        area: {
          idArea: 1,
          descripcion: 'Desarrollo',
          departamento: {
            idDepartamento: 1,
            descripcion: 'Tecnología'
          }
        }
      },
      rol: {
        idRol: 2,
        descripcion: 'USUARIO'
      },
      cargoCompleto: {
        idCargo: 1,
        descripcion: 'Analista de Desarrollo',
        area: {
          idArea: 7,
          descripcion: 'Alplicaciones internas',
          departamento: {
            idDepartamento: 1,
            descripcion: 'Tecnología'
          }
        },
        permisos: {
          esAdministrador: false,
          esAuditor: false
        }
      }
    },
    {
      noUsuario: 12,
      identificacion: '1233445566',
      nombres: 'Juan Carlos',
      apellidos: 'Pérez González',
      usuario: 'jperezZ',
      estado: {
        idEstado: 1,
        descripcion: 'ACTIVO'
      },
      activo: true,
      cargo: {
        idCargo: 1,
        descripcion: 'Analista de Desarrollo',
        area: {
          idArea: 1,
          descripcion: 'Desarrollo',
          departamento: {
            idDepartamento: 1,
            descripcion: 'Tecnología'
          }
        }
      },
      rol: {
        idRol: 2,
        descripcion: 'USUARIO'
      },
      cargoCompleto: {
        idCargo: 1,
        descripcion: 'Analista de Desarrollo',
        area: {
          idArea: 7,
          descripcion: 'Alplicaciones internas',
          departamento: {
            idDepartamento: 1,
            descripcion: 'Tecnología'
          }
        },
        permisos: {
          esAdministrador: true,
          esAuditor: true
        }
      }
    },
    {
      noUsuario: 1,
      identificacion: '1234567890',
      nombres: 'Juan Carlos',
      apellidos: 'Pérez González',
      usuario: 'jperez',
      estado: {
        idEstado: 2,
        descripcion: 'INACTIVO'
      },
      activo: false,
      cargo: {
        idCargo: 1,
        descripcion: 'Analista de Desarrollo',
        area: {
          idArea: 1,
          descripcion: 'Desarrollo',
          departamento: {
            idDepartamento: 1,
            descripcion: 'Tecnología'
          }
        }
      },
      rol: {
        idRol: 2,
        descripcion: 'USUARIO'
      },
      cargoCompleto: {
        idCargo: 1,
        descripcion: 'Analista de Desarrollo',
        area: {
          idArea: 7,
          descripcion: 'Alplicaciones internas',
          departamento: {
            idDepartamento: 1,
            descripcion: 'Tecnología'
          }
        },
        permisos: {
          esAdministrador: false,
          esAuditor: false
        }
      }
    }
  ];

  constructor(private http: HttpClient) {
    // Verificar si hay un token guardado al inicializar el servicio
    this.initializeAuth();
  }

  private initializeAuth(): void {
    const token = localStorage.getItem(this.tokenKey);
    if (token) {
      // En un caso real, aquí se validaría el token con el backend
      // Por ahora, solo verificamos que existe
      this.loadUserFromToken();
    }
  }

  private loadUserFromToken(): void {
    // En un caso real, aquí se decodificaría el JWT y se cargarían los datos del usuario
    // Por ahora, solo verificamos que el token existe y mantenemos el usuario actual
    console.log('Loading user from token...');

    // Si ya hay un usuario cargado, no hacer nada
    if (this.currentUser) {
      console.log('User already loaded:', this.currentUser);
      return;
    }

    // Si no hay usuario, cargar uno mock como fallback
    const mockUser = this.mockUsers[0];
    if (mockUser) {
      console.log('Loading mock user as fallback');
      this.currentUser = this.convertMockUserToUsuarioData(mockUser);
      this.currentUserSubject.next(this.currentUser);
    }
  }

  private convertMockUserToUsuarioData(mockUser: Usuario & { cargoCompleto: Position }): UsuarioData {
    return {
      idUsuario: mockUser.idUsuario || mockUser.noUsuario || 0,
      identificacion: mockUser.identificacion,
      nombres: mockUser.nombres,
      apellidos: mockUser.apellidos,
      usuario: mockUser.usuario,
      correoEmpresarial: mockUser.correoEmpresarial || '',
      correoPersonal: mockUser.correoPersonal,
      telefono1: mockUser.telefono1 || '',
      telefono2: mockUser.telefono2,
      direccion: mockUser.direccion,
      cargo: {
        idCargo: mockUser.cargoCompleto.idCargo || 0,
        descripcion: mockUser.cargoCompleto.descripcion,
        area: mockUser.cargoCompleto.area.descripcion,
        departamento: mockUser.cargoCompleto.area.departamento?.descripcion || ''
      },
      rol: mockUser.rol?.descripcion || '',
      estado: mockUser.estado?.descripcion || '',
      tipologias: [] // Se cargarían desde el backend
    };
  }

  getCurrentUser(): Observable<UsuarioData | null> {
    return this.currentUserSubject.asObservable();
  }

  getCurrentUserValue(): UsuarioData | null {
    return this.currentUser;
  }

  getAllUsers(): (Usuario & { cargoCompleto: Position })[] {
    return this.mockUsers;
  }


  // Métodos de permisos (simplificados para el nuevo modelo)
  canAccessAdmin(): boolean {
    // En el nuevo modelo, se puede determinar por el rol o cargo
    return this.currentUser?.rol?.toLowerCase().includes('admin') ?? false;
  }

  canAccessUsers(): boolean {
    return this.currentUser?.rol?.toLowerCase().includes('admin') ?? false;
  }

  canAccessReports(): boolean {
    return this.currentUser?.rol?.toLowerCase().includes('auditor') ?? false;
  }

  // Método de login que consume el backend real
  login(username: string, password: string): Observable<boolean> {
    const loginRequest: LoginRequest = {
      usuario: username,
      password: password
    };

    console.log('Sending login request to:', `${this.apiUrl}/auth/login`);
    console.log('Login request data:', loginRequest);

    return this.http.post<AuthResponse>(`${this.apiUrl}/auth/login`, loginRequest)
      .pipe(
        map((response: AuthResponse) => {
          console.log('Login response received:', response);

          // Guardar el token
          localStorage.setItem(this.tokenKey, response.token);
          console.log('Token saved to localStorage');

          // Actualizar el usuario actual
          this.currentUser = response.usuario;
          this.currentUserSubject.next(this.currentUser);
          console.log('Current user updated:', this.currentUser);

          return true;
        }),
        catchError((error: any) => {
          console.error('Error en login:', error);
          return throwError(() => error);
        })
      );
  }

  // Método de login síncrono para compatibilidad (usar solo en desarrollo)
  loginSync(username: string, password: string): boolean {
    // Buscar usuario por nombre de usuario en datos mock
    const user = this.mockUsers.find(u => u.usuario === username && u.activo);

    if (user) {
      // En desarrollo, aceptamos cualquier contraseña de 4+ caracteres
      if (password && password.length >= 4) {
        this.currentUser = this.convertMockUserToUsuarioData(user);
        this.currentUserSubject.next(this.currentUser);
        return true;
      }
    }

    return false;
  }

  // Método de logout
  logout(): Observable<boolean> {
    const token = localStorage.getItem(this.tokenKey);

    if (token) {
      return this.http.post<MessageResponse>(`${this.apiUrl}/auth/logout`, {}, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      }).pipe(
        map(() => {
          this.clearAuthData();
          return true;
        }),
        catchError((error: any) => {
          console.error('Error en logout:', error);
          // Aunque falle el logout en el backend, limpiar datos locales
          this.clearAuthData();
          return throwError(() => error);
        })
      );
    } else {
      this.clearAuthData();
      return of(true);
    }
  }

  private clearAuthData(): void {
    localStorage.removeItem(this.tokenKey);
    this.currentUser = null;
    this.currentUserSubject.next(null);
  }

  // Método de logout síncrono para compatibilidad
  logoutSync(): void {
    this.clearAuthData();
  }

  // Verificar si el usuario está autenticado
  isAuthenticated(): boolean {
    const hasUser = this.currentUser !== null;
    const hasToken = this.getToken() !== null;
    const isActive = this.currentUser?.estado === 'Activo' || this.currentUser?.estado === 'ACTIVO' || this.currentUser?.estado === 'activo';

    console.log('Auth check:', { hasUser, hasToken, isActive, estado: this.currentUser?.estado });

    return hasUser && hasToken && (isActive || !this.currentUser?.estado); // Si no hay estado, asumir activo
  }

  // Obtener el token actual
  getToken(): string | null {
    return localStorage.getItem(this.tokenKey);
  }

  // Validar contraseña del usuario autenticado
  validatePassword(password: string): Observable<PasswordValidationResponse> {
    const token = this.getToken();
    if (!token) {
      return throwError(() => new Error('Usuario no autenticado'));
    }

    const request: PasswordValidationRequest = { password };

    return this.http.post<PasswordValidationResponse>(`${this.apiUrl}/auth/validate-password`, request, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    }).pipe(
      catchError((error: any) => {
        console.error('Error validando contraseña:', error);
        // Si hay error de autenticación, devolver respuesta de contraseña incorrecta
        if (error.status === 401) {
          return of({
            valid: false,
            message: 'Contraseña incorrecta'
          });
        }
        return throwError(() => error);
      })
    );
  }
}
