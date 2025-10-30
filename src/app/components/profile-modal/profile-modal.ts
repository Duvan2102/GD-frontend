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
  @Output() showAlert = new EventEmitter<{type: 'success' | 'danger' | 'info' | 'warning', title: string, message: string}>();

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

    const validationResult = this.validateForm();
    if (!validationResult.isValid) {
      // Emitir alerta externa en lugar de mostrar mensaje interno
      this.showAlert.emit({
        type: 'warning',
        title: 'Error de validación',
        message: validationResult.errorMessage
      });
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
          // Emitir alerta externa de éxito
          this.showAlert.emit({
            type: 'success',
            title: '¡Éxito!',
            message: 'Perfil actualizado correctamente'
          });
          
          // Emitir los datos limpios actualizados
          const cleanedData = this.cleanUserData(this.editedUser!);
          this.save.emit(cleanedData);
          
          // Cerrar el modal después de un breve delay
          setTimeout(() => {
            this.onClose();
          }, 500);
        } else {
          // Emitir alerta externa de error
          this.showAlert.emit({
            type: 'danger',
            title: 'Error',
            message: response?.message || 'Error al actualizar el perfil.'
          });
        }
      },
      error: (error) => {
        this.isLoading = false;
        
        // Emitir alerta externa de error
        this.showAlert.emit({
          type: 'danger',
          title: 'Error',
          message: 'Error al actualizar el perfil. Inténtelo de nuevo.'
        });
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
    return this.validateForm().isValid;
  }

  private validateForm(): { isValid: boolean, errorMessage: string } {
    if (!this.editedUser) {
      return { isValid: false, errorMessage: 'No hay datos de usuario para validar.' };
    }
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    
    // Validar correo personal
    if (this.editedUser.correoPersonal && this.editedUser.correoPersonal.trim() !== '' && !emailRegex.test(this.editedUser.correoPersonal)) {
      return { isValid: false, errorMessage: 'El formato del correo personal es inválido. Por favor, ingrese un correo válido.' };
    }
    
    // Validar teléfono móvil (telefono1)
    if (this.editedUser.telefono1 && this.editedUser.telefono1.trim() !== '') {
      const cleanPhone = this.editedUser.telefono1.replace(/\D/g, '');
      
      if (!/^\d+$/.test(cleanPhone)) {
        return { isValid: false, errorMessage: 'El teléfono móvil solo debe contener números.' };
      }
      
      if (cleanPhone.length !== 10) {
        return { isValid: false, errorMessage: 'El teléfono móvil debe tener exactamente 10 dígitos.' };
      }
      
      // Validar que no todos los dígitos sean iguales
      if (/^(\d)\1{9}$/.test(cleanPhone)) {
        return { isValid: false, errorMessage: 'El teléfono móvil no puede contener todos los dígitos iguales.' };
      }
      
      // Validar que no haya más de 3 dígitos consecutivos iguales
      if (/(\d)\1{3,}/.test(cleanPhone)) {
        return { isValid: false, errorMessage: 'El teléfono móvil no puede tener más de 3 dígitos consecutivos iguales.' };
      }
    }
    
    // Validar teléfono (telefono2)
    if (this.editedUser.telefono2 && this.editedUser.telefono2.trim() !== '') {
      const cleanPhone = this.editedUser.telefono2.replace(/\D/g, '');
      
      if (!/^\d+$/.test(cleanPhone)) {
        return { isValid: false, errorMessage: 'El teléfono solo debe contener números.' };
      }
      
      if (cleanPhone.length !== 10) {
        return { isValid: false, errorMessage: 'El teléfono debe tener exactamente 10 dígitos.' };
      }
      
      // Validar que no todos los dígitos sean iguales
      if (/^(\d)\1{9}$/.test(cleanPhone)) {
        return { isValid: false, errorMessage: 'El teléfono no puede contener todos los dígitos iguales.' };
      }
      
      // Validar que no haya más de 3 dígitos consecutivos iguales
      if (/(\d)\1{3,}/.test(cleanPhone)) {
        return { isValid: false, errorMessage: 'El teléfono no puede tener más de 3 dígitos consecutivos iguales.' };
      }
    }
    
    return { isValid: true, errorMessage: '' };
  }

  onlyNumbers(event: KeyboardEvent): boolean {
    const charCode = event.which ? event.which : event.keyCode;
    // Permitir: backspace, delete, tab, escape, enter
    if ([8, 9, 27, 13, 46].indexOf(charCode) !== -1) {
      return true;
    }
    // Permitir solo números (0-9)
    if (charCode < 48 || charCode > 57) {
      event.preventDefault();
      return false;
    }
    return true;
  }
}
