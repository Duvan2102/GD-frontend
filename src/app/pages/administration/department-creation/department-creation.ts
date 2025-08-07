import { Component, EventEmitter, Input, Output, HostListener, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

export interface Department {
  idDepartamento?: number;
  descripcion: string;
}

@Component({
  selector: 'app-department-creation',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './department-creation.html',
  styleUrls: ['./department-creation.css']
})
export class DepartmentCreation implements OnChanges {
  @Input() mode: 'create' | 'update' = 'create';
  @Input() departmentToEdit?: Department;
  @Input() isVisible = false;
  @Output() create = new EventEmitter<string>();
  @Output() update = new EventEmitter<Department>();      
  @Output() cancel = new EventEmitter<void>();

  nombreDepartamento = '';

  get modalTitle(): string {
    return this.mode === 'update'
      ? 'Actualización del departamento'
      : 'Crear Departamento';
  }

  ngOnChanges(changes: SimpleChanges): void {
  if (changes['isVisible'] && this.isVisible) {
      this.nombreDepartamento = (this.mode === 'update' && this.departmentToEdit)
        ? this.departmentToEdit.descripcion
        : '';
    }
  }

  @HostListener('document:keydown.escape')
  onEsc(): void {
    if (this.isVisible) this.onCancel();
  }

  onCreate(): void {
    const value = this.nombreDepartamento.trim();
    if (!value) return;

    if (this.mode === 'create') {
      this.create.emit(value);
    } else if (this.departmentToEdit) { 
      this.update.emit({ ...this.departmentToEdit, descripcion: value }); 
    }

    this.reset();
  }

  onCancel(): void {
    this.cancel.emit();
    this.reset();
  }

  private reset(): void {
    this.nombreDepartamento = '';
  }
}