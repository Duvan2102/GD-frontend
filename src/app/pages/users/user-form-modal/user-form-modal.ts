import { Component, Input, Output, EventEmitter, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Usuario } from '../users';
import { UserService } from '../../../services/user.service';

@Component({
  selector: 'app-user-form-modal',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  providers: [UserService],
  templateUrl: './user-form-modal.html',
  styleUrls: ['./user-form-modal.css']
})
export class UserFormModal implements OnChanges {
  @Input() isVisible = false;
  @Input() user: Usuario | null = null;
  @Input() isEditMode = false;
  @Output() close = new EventEmitter<void>();
  @Output() save = new EventEmitter<Usuario>();
  
  userForm: FormGroup;
  dobleAutenticacionOptions = ['Google Authenticator', 'Token de Seguridad'];
  
  // Variables para controlar el estado de la operación
  isLoading = false; // Para mostrar un spinner mientras se procesa
  errorMessage = ''; // Para mostrar errores al usuario

  // INYECTA EL SERVICIO en el constructor
  constructor(
    private fb: FormBuilder,
    private userService: UserService // AGREGA ESTA LÍNEA
  ) {
    this.userForm = this.fb.group({
      noUsuario: [null],
      identificacion: ['', Validators.required],
      nombres: ['', Validators.required],
      apellidos: ['', Validators.required],
      usuario: ['', Validators.required],
      cargo: ['', Validators.required],
      correoEmpresarial: ['', [Validators.required, Validators.email]],
      correoPersonal: ['', [Validators.required, Validators.email]],
      celular: ['', Validators.required],
      telefono: [''],
      direccion: [''],
      dobleAutenticacion: ['Google Authenticator', Validators.required],
      perfiles: this.fb.group({
        administrador: [false],
        funcionarioCreador: [false],
        funcionarios: [false]
      })
    });
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['isVisible'] && this.isVisible) {
      // Limpiar mensaje de error cuando se abre el modal
      this.errorMessage = '';
      
      if (this.isEditMode && this.user) {
        this.userForm.patchValue(this.user);
      } else {
        this.userForm.reset({
          dobleAutenticacion: 'Google Authenticator',
          perfiles: {
            administrador: false,
            funcionarioCreador: false,
            funcionarios: false
          }
        });
      }
    }
  }

  /**
   * MÉTODO ACTUALIZADO PARA GUARDAR
   */
  onSave(): void {
    // Validar que el formulario esté correcto
    if (this.userForm.invalid) {
      // Marcar todos los campos como touched para mostrar los errores
      this.userForm.markAllAsTouched();
      return;
    }

    // Activar el estado de carga
    this.isLoading = true;
    this.errorMessage = '';

    // Obtener los datos del formulario
    const usuarioData = this.userForm.value;

    // Decidir si crear o actualizar según el modo
    const operacion = this.isEditMode 
/*      ? this.userService.actualizarUsuario(usuarioData)
      : this.userService.crearUsuario(usuarioData);

    // Ejecutar la operación
    operacion.subscribe({
      // ¿Qué pasa si la operación es exitosa?
      next: (response) => {
        console.log('Usuario guardado exitosamente:', response);
        
        // Emitir el evento save para notificar al componente padre
        this.save.emit(usuarioData);
        
        // Cerrar el modal
        this.onClose();
        
        // Opcional: Mostrar mensaje de éxito
        alert(this.isEditMode ? 'Usuario actualizado correctamente' : 'Usuario creado correctamente');
      },
      
      // ¿Qué pasa si hay un error?
      error: (error) => {
        console.error('Error al guardar usuario:', error);
        
        // Mostrar el error al usuario
        this.errorMessage = this.obtenerMensajeError(error);
        
        // Desactivar el loading
        this.isLoading = false;
      },
      
      // ¿Qué pasa cuando la operación termina (exitosa o con error)?
      complete: () => {
        // Desactivar el loading
        this.isLoading = false;
      }
    });
  }

  /**
   * MÉTODO PARA MANEJAR ERRORES
   * 
   * Convierte los errores técnicos en mensajes amigables para el usuario
   
  private obtenerMensajeError(error: any): string {
    // Si el servidor envió un mensaje específico
    if (error.error && error.error.message) {
      return error.error.message;
    }
    
    // Errores comunes de HTTP
    switch (error.status) {
      case 400:
        return 'Los datos enviados no son válidos. Por favor, revisa el formulario.';
      case 401:
        return 'No tienes permisos para realizar esta operación.';
      case 404:
        return 'El usuario no fue encontrado.';
      case 409:
        return 'Ya existe un usuario con esta identificación o nombre de usuario.';
      case 500:
        return 'Error interno del servidor. Por favor, intenta más tarde.';
      default:
        return 'Error inesperado. Por favor, intenta más tarde.';
    }
  }

  onClose(): void {
    // Limpiar errores al cerrar
    this.errorMessage = '';
    this.isLoading = false;
    this.close.emit();
  }

  get modalTitle(): string {
    return this.isEditMode ? 'Editar Usuario' : 'Agregar Usuario';
  }

  get submitButtonText(): string {
    if (this.isLoading) {
      return this.isEditMode ? 'Guardando...' : 'Creando...';
    }
    return this.isEditMode ? 'Guardar Cambios' : 'Crear Usuario';
  }
*/}}