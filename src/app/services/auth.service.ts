import { Injectable } from '@angular/core';
import { Observable, of, BehaviorSubject } from 'rxjs';
import { Usuario } from '../interfaces/common.interfaces';
import { Position } from './positions.service';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private users: (Usuario & { cargoCompleto: Position })[] = [
    {
      noUsuario: 2,
      identificacion: '1234567802',
      nombres: 'Nombre2',
      apellidos: 'Apellido2',
      usuario: 'usuario2',
      estado: 'Activo',
      activo: true,
      cargo: 'Contador',
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
      estado: 'Activo',
      activo: true,
      cargo: 'Analista de Desarrollo',
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
      estado: 'Activo',
      activo: true,
      cargo: 'Analista de Desarrollo',
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
      estado: 'Activo',
      activo: true,
      cargo: 'Analista de Desarrollo',
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
      estado: 'Activo',
      activo: true,
      cargo: 'Analista de Desarrollo',
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
      estado: 'Activo',
      activo: true,
      cargo: 'Analista de Desarrollo',
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
      estado: 'Activo',
      activo: true,
      cargo: 'Analista de Desarrollo',
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
      estado: 'Activo',
      activo: true,
      cargo: 'Desarrollador Senior',
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
      estado: 'Activo',
      activo: true,
      cargo: 'Analista de Desarrollo',
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
      estado: 'Activo',
      activo: true,
      cargo: 'Analista de Desarrollo',
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
      estado: 'Inactivo',
      activo: false,
      cargo: 'Analista de Desarrollo',
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

  private currentUserSubject = new BehaviorSubject<Usuario & { cargoCompleto: Position }>(this.users[0]);
  private currentUser: Usuario & { cargoCompleto: Position } = this.users[0];

  constructor() { }

  getCurrentUser(): Observable<Usuario & { cargoCompleto: Position }> {
    return this.currentUserSubject.asObservable();
  }

  getCurrentUserValue(): (Usuario & { cargoCompleto: Position }) | null {
    return this.currentUser ?? null;
  }

  getAllUsers(): (Usuario & { cargoCompleto: Position })[] {
    return this.users;
  }

  switchUser(userId: number): boolean {
    const user = this.users.find(u => u.noUsuario === userId);
    if (user) {
      this.currentUser = user;
      this.currentUserSubject.next(user);
      return true;
    }
    return false;
  }

  switchUserByUsername(username: string): boolean {
    const user = this.users.find(u => u.usuario === username);
    if (user) {
      this.currentUser = user;
      this.currentUserSubject.next(user);
      return true;
    }
    return false;
  }

  // Permisos según privilegio por letra del cargo: E=Admin, I=Usuario, A=Auditor
  setCargoPrivilege(privilegio: 'E'|'I'|'A'): void {
    const isAdmin = privilegio === 'E';
    const isAuditor = privilegio === 'A';
    this.currentUser.cargoCompleto.permisos = {
      esAdministrador: isAdmin,
      esAuditor: isAuditor
    };
  }

  // El administrador tiene acceso a las vistas de Usuarios y Administración
  canAccessAdmin(): boolean {
    return this.currentUser.cargoCompleto.permisos?.esAdministrador ?? false;
  }

  canAccessUsers(): boolean {
    return this.currentUser.cargoCompleto.permisos?.esAdministrador ?? false;
  }

  // El auditor tiene acceso a la vista de Reportes
  canAccessReports(): boolean {
    return this.currentUser.cargoCompleto.permisos?.esAuditor ?? false;
  }
}
