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

  editedUser: UsuarioData | null = null;
  isLoading = false;
  errorMessage = '';
  modalSuccessVisible = false;
  modalSuccessMessage = '';
  modalSuccessBtn = 'Aceptar';

  constructor(private userService: UserService) {}

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['user'] && this.user) {
      this.editedUser = { 
        ...this.user,
        telefono1: this.user.telefono1 || '',
        telefono2: this.user.telefono2 || ''
      };
    }
  }

  onClose(): void {
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
      estado: {
        idEstado: 4,
        descripcion: 'PENDIENTE'
      },
      cargo: undefined,
      rol: {
        idRol: 2,
        descripcion: 'FUNCIONARIO'
      },
      dobleAutenticacion: 'GOOGLE_AUTH'
    };

    this.userService.actualizarUsuario(usuarioToUpdate).subscribe({
      next: (response) => {
        this.isLoading = false;
        
        if (response && (response.success === true || (response as any).idUsuario)) {
          this.mostrarModalSuccess('Usuario registrado correctamente. Quedará pendiente de activación por el administrador.');
          this.save.emit(this.editedUser!);
        } else {
          this.errorMessage = response?.message || 'Error al registrar el usuario.';
        }
      },
      error: (error) => {
        this.isLoading = false;
        this.errorMessage = 'Error al registrar el usuario. Inténtelo de nuevo.';
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
