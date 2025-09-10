import { Component, Input, Output, EventEmitter, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { UsuarioData, Usuario } from '../../interfaces/common.interfaces';
import { UserService } from '../../services/user.service';
import { SuccessModal } from '../../pages/users/success-modal/success-modal';

@Component({
  selector: 'app-profile-modal',
  standalone: true,
  imports: [CommonModule, FormsModule, SuccessModal],
  templateUrl: './profile-modal.html',
  styleUrls: ['./profile-modal.css']
})
export class ProfileModal implements OnChanges {
  @Input() isVisible = false;
  @Input() user: UsuarioData | null = null;
  @Output() close = new EventEmitter<void>();
  @Output() save = new EventEmitter<UsuarioData>();

  // Copia del usuario para edición
  editedUser: UsuarioData | null = null;
  
  // Estados de carga y mensajes
  isLoading = false;
  errorMessage = '';
  
  // Modal de éxito
  modalSuccessVisible = false;
  modalSuccessMessage = '';
  modalSuccessBtn = 'Aceptar';

  constructor(private userService: UserService) {}

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['user'] && this.user) {
      // Crear una copia del usuario para edición con mapeo correcto de teléfonos
      this.editedUser = { 
        ...this.user,
        // Asegurar que los teléfonos estén disponibles
        telefono1: this.user.telefono1 || '',
        telefono2: this.user.telefono2 || ''
      };
    }
  }

  onClose(): void {
    // Restaurar los datos originales al cerrar
    if (this.user) {
      this.editedUser = { 
        ...this.user,
        telefono1: this.user.telefono1 || '',
        telefono2: this.user.telefono2 || ''
      };
    }
    this.close.emit();
  }

  onSave(): void {
    if (!this.editedUser) return;

    if (!this.isFormValid()) {
      this.errorMessage = 'Por favor complete todos los campos requeridos correctamente.';
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';

    const cleanedData = this.cleanUserData(this.editedUser);
    
    const usuarioToUpdate: Usuario = {
      idUsuario: cleanedData.idUsuario,
      identificacion: cleanedData.identificacion,
      nombres: cleanedData.nombres,
      apellidos: cleanedData.apellidos,
      usuario: cleanedData.usuario,
      correoEmpresarial: cleanedData.correoEmpresarial,
      correoPersonal: cleanedData.correoPersonal || '',
      telefono1: cleanedData.telefono1 || '',
      telefono2: cleanedData.telefono2 || '',
      direccion: cleanedData.direccion || '',
      dobleAutenticacion: true,
      estado: {
        idEstado: 5,
        descripcion: 'ACTIVO'
      },
      cargo: {
        idCargo: cleanedData.cargo.idCargo,
        descripcion: cleanedData.cargo.descripcion,
        area: {
          idArea: 1,
          descripcion: cleanedData.cargo.area || 'N/A',
          departamento: {
            idDepartamento: 1,
            descripcion: cleanedData.cargo.departamento || 'N/A'
          }
        }
      },
      rol: {
        idRol: 2,
        descripcion: cleanedData.rol || 'USUARIO'
      }
    };

    this.userService.actualizarUsuario(usuarioToUpdate).subscribe({
      next: (response) => {
        this.isLoading = false;
        
        if (response && (response.success === true || (response as any).idUsuario)) {
          this.mostrarModalSuccess('Perfil actualizado correctamente');
          this.save.emit(this.editedUser!);
        } else {
          this.errorMessage = response?.message || 'Error al actualizar el perfil.';
        }
      },
      error: (error) => {
        this.isLoading = false;
        this.errorMessage = 'Error al actualizar el perfil. Inténtelo de nuevo.';
        console.error('Error actualizando usuario:', error);
      }
    });
  }

  onBackdropClick(event: Event): void {
    if (event.target === event.currentTarget) {
      this.onClose();
    }
  }

  mostrarModalSuccess(mensaje: string, textoBtn: string = 'Aceptar') {
    this.modalSuccessMessage = mensaje;
    this.modalSuccessBtn = textoBtn;
    this.modalSuccessVisible = true;
  }

  cerrarModalSuccess() {
    this.modalSuccessVisible = false;
    this.onClose();
  }

  private cleanUserData(user: UsuarioData): UsuarioData {
    return {
      ...user,
      correoPersonal: user.correoPersonal?.trim() || '',
      telefono1: user.telefono1?.trim() || '',
      telefono2: user.telefono2?.trim() || '',
      direccion: user.direccion?.trim() || ''
    };
  }

  private isFormValid(): boolean {
    if (!this.editedUser) return false;
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    
    if (this.editedUser.correoPersonal && this.editedUser.correoPersonal.trim() !== '' && !emailRegex.test(this.editedUser.correoPersonal)) {
      return false;
    }
    
    if (this.editedUser.telefono1 && this.editedUser.telefono1.trim() !== '') {
      const phoneRegex = /^\d{7,}$/;
      if (!phoneRegex.test(this.editedUser.telefono1.replace(/\s/g, ''))) {
        return false;
      }
    }
    
    if (this.editedUser.telefono2 && this.editedUser.telefono2.trim() !== '') {
      const phoneRegex = /^\d{7,}$/;
      if (!phoneRegex.test(this.editedUser.telefono2.replace(/\s/g, ''))) {
        return false;
      }
    }
    
    return true;
  }
}
