import { Component, Input, Output, EventEmitter, OnChanges, SimpleChanges, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Typology } from '../../../services/typology.service';
import { Department } from '../../../services/department.service';
import { Area } from '../../../services/area.service';
import { Position } from '../../../services/positions.service';

// Interfaces extendidas para el árbol
interface DepartmentWithExpanded extends Department {
  expanded?: boolean;
}

interface AreaWithExpanded extends Area {
  expanded?: boolean;
}

@Component({
  selector: 'app-tipology-creation',
  standalone: true,
  templateUrl: './tipology-creation.html',
  styleUrls: ['./tipology-creation.css'],
  imports: [CommonModule, FormsModule]
})
export class Tipology implements OnChanges {
  @Input() isVisible = false;
  @Input() mode: 'create' | 'update' = 'create';
  @Input() typologyToEdit?: Typology;
  @Input() departments: Department[] = [];
  @Input() areas: Area[] = [];
  @Input() positions: Position[] = [];

  // Arrays con propiedades expandidas para el árbol
  departmentsWithExpanded: DepartmentWithExpanded[] = [];
  areasWithExpanded: AreaWithExpanded[] = [];

  // Estados de los desplegables
  showDepartmentDropdown = false;
  showAreaDropdown = false;
  showPositionDropdown = false;
  
  // Posición del desplegable
  dropdownPosition = { top: 0, left: 0 };

  @Output() create = new EventEmitter<Partial<Typology>>();
  @Output() update = new EventEmitter<Typology>();
  @Output() cancel = new EventEmitter<void>();

  descripcion = '';
  selectedDepartment?: Department;
  selectedArea?: Area;
  selectedPosition?: Position;

  get modalTitle(): string {
    return this.mode === 'update' ? 'Actualización de la Tipología' : 'Crear Tipología';
  }

  ngOnChanges(changes: SimpleChanges): void {
    // Inicializar arrays cuando cambien los datos de entrada
    if (changes['departments'] || changes['areas']) {
      this.initializeExpandedArrays();
    }
    
    if (changes['isVisible'] && this.isVisible) {
      // Asegurar que los arrays estén inicializados
      if (this.departmentsWithExpanded.length === 0) {
        this.initializeExpandedArrays();
      }
      
      if (this.mode === 'update' && this.typologyToEdit) {
        this.descripcion = this.typologyToEdit.descripcion;
        if (this.typologyToEdit.cargo) {
          const { cargo } = this.typologyToEdit;
          const { area } = cargo;
          const { departamento } = area;

          const deptWithExpanded = this.departmentsWithExpanded.find(d => d.idDepartamento === departamento.idDepartamento);
          if (deptWithExpanded) {
            this.selectedDepartment = deptWithExpanded;
            deptWithExpanded.expanded = true;
            
            const areaWithExpanded = this.areasWithExpanded.find(a => a.idArea === area.idArea);
            if (areaWithExpanded) {
              this.selectedArea = areaWithExpanded;
              areaWithExpanded.expanded = true;
              this.selectedPosition = this.positions.find(p => p.idCargo === cargo.idCargo);
            }
          }
        }
      } else {
        this.resetForm();
      }
    }
  }

  private initializeExpandedArrays(): void {
    this.departmentsWithExpanded = this.departments.map(dept => ({ ...dept, expanded: false }));
    this.areasWithExpanded = this.areas.map(area => ({ ...area, expanded: false }));
  }

  toggleDepartmentDropdown() {
    this.showDepartmentDropdown = !this.showDepartmentDropdown;
    // Cerrar otros desplegables
    this.showAreaDropdown = false;
    this.showPositionDropdown = false;
  }

  toggleAreaDropdown() {
    this.showAreaDropdown = !this.showAreaDropdown;
    // Cerrar otros desplegables
    this.showDepartmentDropdown = false;
    this.showPositionDropdown = false;
  }

  togglePositionDropdown() {
    this.showPositionDropdown = !this.showPositionDropdown;
    // Cerrar otros desplegables
    this.showDepartmentDropdown = false;
    this.showAreaDropdown = false;
  }

  // Cerrar desplegables al hacer clic fuera
  @HostListener('document:click', ['$event'])
  onDocumentClick(event: Event) {
    const target = event.target as HTMLElement;
    if (!target.closest('.level-header') && !target.closest('.level-dropdown')) {
      this.showDepartmentDropdown = false;
      this.showAreaDropdown = false;
      this.showPositionDropdown = false;
    }
  }

  selectDepartment(department: DepartmentWithExpanded) {
    this.selectedDepartment = department;
    this.selectedArea = undefined;
    this.selectedPosition = undefined;
    this.showDepartmentDropdown = false;
  }

  selectArea(area: AreaWithExpanded) {
    this.selectedArea = area;
    this.selectedPosition = undefined;
    this.showAreaDropdown = false;
  }

  selectPosition(position: Position) {
    this.selectedPosition = position;
    this.showPositionDropdown = false;
  }

  getAreasByDepartment(departmentId: number): AreaWithExpanded[] {
    return this.areasWithExpanded.filter(area => area.departamento.idDepartamento === departmentId);
  }

  getPositionsByArea(areaId: number): Position[] {
    return this.positions.filter(position => position.area.idArea === areaId);
  }

  onSubmit() {
    if (!this.descripcion.trim() || !this.selectedPosition) return;

    const payload: Partial<Typology> = {
      descripcion: this.descripcion.trim(),
      cargo: this.selectedPosition,
    };

    if (this.mode === 'create') {
      this.create.emit(payload);
    } else if (this.typologyToEdit) {
      this.update.emit({ ...this.typologyToEdit, ...payload });
    }
  }

  onCancel() {
    this.cancel.emit();
    this.resetForm();
  }

  private resetForm(): void {
    this.descripcion = '';
    this.selectedDepartment = undefined;
    this.selectedArea = undefined;
    this.selectedPosition = undefined;
    
    // Reset dropdown states
    this.showDepartmentDropdown = false;
    this.showAreaDropdown = false;
    this.showPositionDropdown = false;
    
    // Reset expanded states
    this.departmentsWithExpanded.forEach(dept => dept.expanded = false);
    this.areasWithExpanded.forEach(area => area.expanded = false);
  }
}