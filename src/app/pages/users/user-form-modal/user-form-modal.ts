import { Component, Input, Output, EventEmitter, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Usuario } from '../users';

@Component({
  selector: 'app-user-form-modal',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './user-form-modal.html',
  styleUrls: ['./user-form-modal.css']
})
export class UserFormModal implements OnChanges {
  @Input() isVisible = false;
  @Input() user: Usuario | null = null;
  @Input() isEditMode = false; // ¡CORRECCIÓN AQUÍ!
  @Output() close = new EventEmitter<void>();
  @Output() save = new EventEmitter<Usuario>();
  

  userForm: FormGroup;
  dobleAutenticacionOptions = ['Google Authenticator', 'Token de Seguridad'];

  constructor(private fb: FormBuilder) {
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

  onSave(): void {
    if (this.userForm.valid) {
      this.save.emit(this.userForm.value);
    }
  }

  onClose(): void {
    this.close.emit();
  }

  get modalTitle(): string {
    return this.isEditMode ? 'Editar Usuario' : 'Agregar Usuario';
  }

  get submitButtonText(): string {
    return this.isEditMode ? 'Guardar Cambios' : 'Crear Usuario';
  }
}