import { Component, Input, Output, EventEmitter, OnChanges, SimpleChanges, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Department } from '../../../services/department.service';

export interface Area {
  idArea?: number;
  descripcion: string;
  departamento: { idDepartamento: number; descripcion?: string };
}

// Interface extendida para el estado de UI
interface DepartmentWithExpanded extends Department {
  expanded?: boolean;
}

@Component({
  selector: 'app-area-creation',
  standalone: true,
  templateUrl: './area-creation.html',
  styleUrls: ['./area-creation.css'],
  imports: [CommonModule, FormsModule]
})
export class AreaCreation implements OnChanges {
  @Input() isVisible: boolean = false;
  @Input() mode: 'create' | 'update' = 'create';
  @Input() departments: Department[] = [];
  @Input() areaToEdit?: Area;

  @Output() create = new EventEmitter<Area>();
  @Output() update = new EventEmitter<Area>();
  @Output() cancel = new EventEmitter<void>();

  area: Area = { descripcion: '', departamento: { idDepartamento: 0 } };

  // Estados de los desplegables
  showDepartmentDropdown = false;

  // Selección actual
  selectedDepartment?: DepartmentWithExpanded;

  // Array con estado expandido
  departmentsWithExpanded: DepartmentWithExpanded[] = [];

  get modalTitle(): string {
    return this.mode === 'update' ? 'Actualización del Área' : 'Crear Área';
  }

  ngOnChanges(changes: SimpleChanges) {
    if (this.isVisible) {
      if (this.mode === 'update' && this.areaToEdit) {
        this.area = { ...this.areaToEdit, departamento: { ...this.areaToEdit.departamento } };
        // Cargar selección para modo edición
        this.loadSelectionForEdit();
      } else {
        this.resetForm();
      }
    }

    // Inicializar arrays cuando cambien los datos
    if (changes['departments']) {
      this.initializeExpandedArrays();
    }
  }

  onSubmit() {
    if (!this.area.descripcion.trim() || !this.selectedDepartment) {
      return;
    }
    
    // Asignar el departamento seleccionado al area
    this.area.departamento = { 
      idDepartamento: this.selectedDepartment.idDepartamento!,
      descripcion: this.selectedDepartment.descripcion
    };
    
    if (this.mode === 'create') {
      this.create.emit({ ...this.area });
    } else {
      this.update.emit({ ...this.area });
    }
  }

  onCancel() {
    this.cancel.emit();
    this.resetForm();
  }

  private resetForm() {
    this.area = { descripcion: '', departamento: { idDepartamento: 0 } };
    this.selectedDepartment = undefined;
    this.showDepartmentDropdown = false;
  }

  private initializeExpandedArrays(): void {
    this.departmentsWithExpanded = this.departments.map(dept => ({ ...dept, expanded: false }));
  }

  private loadSelectionForEdit(): void {
    if (this.areaToEdit && this.areaToEdit.departamento) {
      this.selectedDepartment = this.departmentsWithExpanded.find(d => d.idDepartamento === this.areaToEdit!.departamento.idDepartamento);
    }
  }

  // Métodos para manejar los desplegables
  toggleDepartmentDropdown() {
    this.showDepartmentDropdown = !this.showDepartmentDropdown;
  }

  selectDepartment(department: DepartmentWithExpanded) {
    this.selectedDepartment = department;
    this.showDepartmentDropdown = false;
  }

  // Cerrar desplegables al hacer clic fuera
  @HostListener('document:click', ['$event'])
  onDocumentClick(event: Event) {
    const target = event.target as HTMLElement;
    if (!target.closest('.level-header') && !target.closest('.level-dropdown')) {
      this.showDepartmentDropdown = false;
    }
  }
}