import { Component, Input, Output, EventEmitter, OnChanges, SimpleChanges, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Area } from '../../../services/area.service';
import { Position } from '../../../services/positions.service';
import { Department } from '../../../services/department.service';

// Interfaces extendidas para el estado de UI
interface DepartmentWithExpanded extends Department {
  expanded?: boolean;
}

interface AreaWithExpanded extends Area {
  expanded?: boolean;
}

@Component({
  selector: 'app-positions-creation',
  standalone: true,
  templateUrl: './positions-creation.html',
  styleUrls: ['./positions-creation.css'],
  imports: [CommonModule, FormsModule]
})
export class PositionsCreation implements OnChanges {
  @Input() isVisible: boolean = false;
  @Input() mode: 'create' | 'update' = 'create';
  @Input() positionToEdit?: Position;
  @Input() areas: Area[] = [];
  @Input() departments: Department[] = [];

  @Output() create = new EventEmitter<Position>();
  @Output() update = new EventEmitter<Position>();
  @Output() cancel = new EventEmitter<void>();

  position: Position = this.getInitialPositionState();
  errorMessage = '';

  // Estados de los desplegables
  showDepartmentDropdown = false;
  showAreaDropdown = false;

  // Selecciones actuales
  selectedDepartment?: DepartmentWithExpanded;
  selectedArea?: AreaWithExpanded;

  // Arrays con estado expandido
  departmentsWithExpanded: DepartmentWithExpanded[] = [];
  areasWithExpanded: AreaWithExpanded[] = [];

  get modalTitle(): string {
    return this.mode === 'update' ? 'Actualización del Cargo' : 'Crear Cargo';
  }

  get isFormValid(): boolean {
    const trimmed = this.position.descripcion.trim();
    return trimmed.length > 0 && this.validateName(trimmed) && !!this.selectedArea;
  }

  private validateName(name: string): boolean {
    // Contar cuántas letras tiene el nombre
    const letterCount = (name.match(/[a-zA-ZáéíóúÁÉÍÓÚñÑüÜ]/g) || []).length;
    
    // Verificar si es solo numérico
    const isOnlyNumeric = /^[\d\s]+$/.test(name);
    
    if (isOnlyNumeric) {
      this.errorMessage = 'El nombre no puede contener solo números';
      return false;
    }
    
    if (letterCount < 3) {
      this.errorMessage = 'El nombre debe contener al menos 3 letras';
      return false;
    }
    
    this.errorMessage = '';
    return true;
  }

  validateOnChange(): void {
    const trimmed = this.position.descripcion.trim();
    if (trimmed.length > 0) {
      this.validateName(trimmed);
    } else {
      this.errorMessage = '';
    }
  }

  ngOnChanges(changes: SimpleChanges) {
    if (this.isVisible) {
      if (this.mode === 'update' && this.positionToEdit) {
        this.position = JSON.parse(JSON.stringify(this.positionToEdit));
        if (!this.position.permisos) {
          this.position.permisos = {
            esAdministrador: false,
            esAuditor: false
          };
        }
        // Cargar selecciones para modo edición
        this.loadSelectionsForEdit();
      } else {
        this.resetForm();
      }
    }

    // Inicializar arrays cuando cambien los datos
    if (changes['departments'] || changes['areas']) {
      this.initializeExpandedArrays();
    }
  }

  onSubmit() {
    const trimmed = this.position.descripcion.trim();
    if (!trimmed || !this.validateName(trimmed) || !this.selectedArea) {
      return;
    }
    
    // Asignar el área seleccionada al position
    this.position.area = { ...this.selectedArea };
    
    if (this.mode === 'create') {
      this.create.emit({ ...this.position });
    } else {
      this.update.emit({ ...this.position });
    }
  }

  onCancel() {
    this.cancel.emit();
    this.resetForm();
  }

  private getInitialPositionState(): Position {
    return {
      descripcion: '',
      area: { idArea: 0, descripcion: '', departamento: { idDepartamento: 0, descripcion: '' } },
      permisos: {
        esAdministrador: false,
        esAuditor: false
      }
    };
  }

  private resetForm() {
    this.position = this.getInitialPositionState();
    this.selectedDepartment = undefined;
    this.selectedArea = undefined;
    this.showDepartmentDropdown = false;
    this.showAreaDropdown = false;
    this.errorMessage = '';
  }

  private initializeExpandedArrays(): void {
    this.departmentsWithExpanded = this.departments.map(dept => ({ ...dept, expanded: false }));
    this.areasWithExpanded = this.areas.map(area => ({ ...area, expanded: false }));
  }

  private loadSelectionsForEdit(): void {
    if (this.positionToEdit && this.positionToEdit.area) {
      // Buscar el departamento del área
      const area = this.areas.find(a => a.idArea === this.positionToEdit!.area.idArea);
      if (area && area.departamento) {
        this.selectedDepartment = this.departmentsWithExpanded.find(d => d.idDepartamento === area.departamento.idDepartamento);
        this.selectedArea = this.areasWithExpanded.find(a => a.idArea === area.idArea);
      }
    }
  }

  // Métodos para manejar los desplegables
  toggleDepartmentDropdown() {
    this.showDepartmentDropdown = !this.showDepartmentDropdown;
    this.showAreaDropdown = false;
  }

  toggleAreaDropdown() {
    this.showAreaDropdown = !this.showAreaDropdown;
    this.showDepartmentDropdown = false;
  }

  selectDepartment(department: DepartmentWithExpanded) {
    this.selectedDepartment = department;
    this.selectedArea = undefined;
    this.showDepartmentDropdown = false;
  }

  selectArea(area: AreaWithExpanded) {
    this.selectedArea = area;
    this.showAreaDropdown = false;
  }

  getAreasByDepartment(departmentId: number): AreaWithExpanded[] {
    return this.areasWithExpanded.filter(area => area.departamento.idDepartamento === departmentId);
  }

  // Cerrar desplegables al hacer clic fuera
  @HostListener('document:click', ['$event'])
  onDocumentClick(event: Event) {
    const target = event.target as HTMLElement;
    if (!target.closest('.level-header') && !target.closest('.level-dropdown')) {
      this.showDepartmentDropdown = false;
      this.showAreaDropdown = false;
    }
  }
}