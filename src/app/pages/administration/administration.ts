import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

export interface Typology {
  id?: number;
  name: string;
  department: string;
  area: string;
  position: string;
}

export interface Department {
  id: number;
  name: string;
}

export interface Area {
  id: number;
  name: string;
  departmentId: number;
}

export interface Position {
  id: number;
  name: string;
  areaId: number;
}

@Component({
  standalone: true,
  selector: 'app-administration',
  templateUrl: './administration.html',
  styleUrls: ['./administration.css'],
  imports: [
    CommonModule,
    FormsModule
  ]
})
export class Administration implements OnInit {
  typologiesExpanded = true;
  departmentsExpanded = false;
  areasExpanded = false;
  positionsExpanded = false;

  typologies: Typology[] = [
    { id: 1, name: 'VACACIONES', department: 'ADMINISTRACION', area: 'RECURSOS_HUMANOS', position: 'TODOS' },
    { id: 2, name: 'REQUISICIONES', department: 'ADMINISTRACION', area: 'ADMINISTRACION', position: 'DIRECTORES' },
    { id: 3, name: 'VIATICOS', department: 'FINANZAS', area: 'TESORERIA', position: 'TODOS' }
  ];

  departments: Department[] = [
    { id: 1, name: 'GERENCIA' },
    { id: 2, name: 'ADMINISTRACION' },
    { id: 3, name: 'FINANZAS' },
    { id: 4, name: 'TECNOLOGIA' },
    { id: 5, name: 'SOPORTE' },
    { id: 6, name: 'COMERCIAL' },
    { id: 7, name: 'PROCESOS' }
  ];

  areas: Area[] = [
    { id: 1, name: 'ADMINISTRACION', departmentId: 2 },
    { id: 2, name: 'RECURSOS_HUMANOS', departmentId: 2 },
    { id: 3, name: 'TESORERIA', departmentId: 3 },
    { id: 4, name: 'APLICACIONES INTERNAS', departmentId: 4 }
  ];

  positions: Position[] = [
    { id: 1, name: 'ANALISTA', areaId: 4 },
    { id: 2, name: 'LIDER TÉCNICO', areaId: 2 },
    { id: 3, name: 'CONTADOR', areaId: 3 },
    { id: 4, name: 'DESARROLLADOR', areaId: 4 }
  ];

  showTypologyCreateModal = false;
  showTypologyUpdateModal = false;
  showTypologyDeleteConfirmModal = false;
  showTypologyCreateConfirmModal = false;
  showTypologyUpdateConfirmModal = false;
  showTypologySuccessModal = false;

  newTypology: Typology = { name: '', department: '', area: '', position: '' };
  selectedTypology: Typology | null = null;

  showDepartmentCreateModal = false;
  showDepartmentUpdateModal = false;
  showDepartmentDeleteConfirmModal = false;
  showDepartmentCreateConfirmModal = false;
  showDepartmentUpdateConfirmModal = false;
  showDepartmentSuccessModal = false;

  newDepartment: Department = { id: 0, name: '' };
  selectedDepartment: Department | null = null;

  showAreaCreateModal = false;
  showAreaUpdateModal = false;
  showAreaDeleteConfirmModal = false;
  showAreaCreateConfirmModal = false;
  showAreaUpdateConfirmModal = false;
  showAreaSuccessModal = false;

  newArea: Area = { id: 0, name: '', departmentId: 0 };
  selectedArea: Area | null = null;

  showPositionCreateModal = false;
  showPositionUpdateModal = false;
  showPositionDeleteConfirmModal = false;
  showPositionCreateConfirmModal = false;
  showPositionUpdateConfirmModal = false;
  showPositionSuccessModal = false;

  newPosition: Position = { id: 0, name: '', areaId: 0 };
  selectedPosition: Position | null = null;

  modalTitle = '';
  modalMessage = '';
  currentEntityType: 'typology' | 'department' | 'area' | 'position' | null = null;
  currentActionType: 'create' | 'update' | 'delete' | null = null;

  filteredAreas: Area[] = [];
  filteredPositions: Position[] = [];
  filteredDepartmentsForAreas: Department[] = [];
  filteredAreasForPositions: Area[] = [];

  constructor() {}

  ngOnInit(): void {
    this.filteredAreas = [...this.areas];
    this.filteredPositions = [...this.positions];
    this.filteredDepartmentsForAreas = [...this.departments];
    this.filteredAreasForPositions = [...this.areas];
  }

  getAssociatedName(id: number, list: any[], key: string): string {
    const item = list.find(item => item.id === id);
    return item ? item[key] : 'N/A';
  }

  toggleTypologies(): void { this.typologiesExpanded = !this.typologiesExpanded; }
  toggleDepartments(): void { this.departmentsExpanded = !this.departmentsExpanded; }
  toggleAreas(): void { this.areasExpanded = !this.areasExpanded; }
  togglePositions(): void { this.positionsExpanded = !this.positionsExpanded; }

  openTypologyCreateModal(): void {
    this.newTypology = { name: '', department: '', area: '', position: '' };
    this.filteredAreas = [...this.areas];
    this.filteredPositions = [...this.positions];
    this.showTypologyCreateModal = true;
  }

  openTypologyUpdateModal(typology: Typology): void {
    this.selectedTypology = { ...typology };
    this.onTypologyDepartmentChange(typology.department);
    this.onTypologyAreaChange(typology.area);
    this.showTypologyUpdateModal = true;
  }

  openTypologyDeleteConfirmModal(typology: Typology): void {
    this.selectedTypology = typology;
    this.currentEntityType = 'typology';
    this.currentActionType = 'delete';
    this.modalTitle = 'Confirm Deletion';
    this.modalMessage = `Are you sure you want to delete typology "${typology.name}"?`;
    this.showTypologyDeleteConfirmModal = true;
  }

  onTypologyDepartmentChange(departmentName: string): void {
    const department = this.departments.find(d => d.name === departmentName);
    if (department) {
      this.filteredAreas = this.areas.filter(a => a.departmentId === department.id);
      if (this.showTypologyCreateModal) {
        this.newTypology.area = '';
        this.newTypology.position = '';
      } else if (this.showTypologyUpdateModal && this.selectedTypology) {
        this.selectedTypology.area = '';
        this.selectedTypology.position = '';
      }
      this.filteredPositions = [];
    } else {
      this.filteredAreas = [];
      this.filteredPositions = [];
      if (this.showTypologyCreateModal) { this.newTypology.area = ''; this.newTypology.position = ''; }
      else if (this.showTypologyUpdateModal && this.selectedTypology) { this.selectedTypology.area = ''; this.selectedTypology.position = ''; }
    }
  }

  onTypologyAreaChange(areaName: string): void {
    const area = this.areas.find(a => a.name === areaName);
    if (area) {
      this.filteredPositions = this.positions.filter(p => p.areaId === area.id);
      if (this.showTypologyCreateModal) { this.newTypology.position = ''; }
      else if (this.showTypologyUpdateModal && this.selectedTypology) { this.selectedTypology.position = ''; }
    } else {
      this.filteredPositions = [];
      if (this.showTypologyCreateModal) { this.newTypology.position = ''; }
      else if (this.showTypologyUpdateModal && this.selectedTypology) { this.selectedTypology.position = ''; }
    }
  }

  initiateTypologyCreate(): void {
    if (this.validateTypologyForm(this.newTypology)) {
      this.showTypologyCreateModal = false;
      this.currentEntityType = 'typology';
      this.currentActionType = 'create';
      this.modalTitle = 'Confirm Creation';
      this.modalMessage = `Are you sure you want to create this Typology?`;
      this.showTypologyCreateConfirmModal = true;
    }
  }

  confirmTypologyCreate(): void {
    const newId = Math.max(...this.typologies.map(t => t.id || 0)) + 1;
    this.typologies.push({ ...this.newTypology, id: newId });
    this.showTypologyCreateConfirmModal = false;
    this.modalTitle = 'Typology Created';
    this.modalMessage = 'successfully';
    this.showTypologySuccessModal = true;
  }

  initiateTypologyUpdate(): void {
    if (this.selectedTypology && this.validateTypologyForm(this.selectedTypology)) {
      this.showTypologyUpdateModal = false;
      this.currentEntityType = 'typology';
      this.currentActionType = 'update';
      this.modalTitle = 'Confirm Update';
      this.modalMessage = `Are you sure you want to update this Typology?`;
      this.showTypologyUpdateConfirmModal = true;
    }
  }

  confirmTypologyUpdate(): void {
    if (this.selectedTypology) {
      const index = this.typologies.findIndex(t => t.id === this.selectedTypology!.id);
      if (index !== -1) { this.typologies[index] = { ...this.selectedTypology }; }
      this.showTypologyUpdateConfirmModal = false;
      this.modalTitle = 'Typology updated';
      this.modalMessage = 'successfully';
      this.showTypologySuccessModal = true;
    }
  }

  confirmTypologyDelete(): void {
    if (this.selectedTypology) {
      const index = this.typologies.findIndex(t => t.id === this.selectedTypology!.id);
      if (index !== -1) { this.typologies.splice(index, 1); }
      this.showTypologyDeleteConfirmModal = false;
      this.modalTitle = 'Typology deleted';
      this.modalMessage = 'successfully';
      this.showTypologySuccessModal = true;
    }
  }

  validateTypologyForm(typology: Typology): boolean {
    return !!(typology.name && typology.department && typology.area && typology.position);
  }

  openDepartmentCreateModal(): void {
    this.newDepartment = { id: 0, name: '' };
    this.showDepartmentCreateModal = true;
  }

  openDepartmentUpdateModal(department: Department): void {
    this.selectedDepartment = { ...department };
    this.showDepartmentUpdateModal = true;
  }

  openDepartmentDeleteConfirmModal(department: Department): void {
    this.selectedDepartment = department;
    this.currentEntityType = 'department';
    this.currentActionType = 'delete';
    this.modalTitle = 'Confirm Deletion';
    this.modalMessage = `Are you sure you want to delete department "${department.name}"?`;
    this.showDepartmentDeleteConfirmModal = true;
  }

  initiateDepartmentCreate(): void {
    if (this.validateDepartmentForm(this.newDepartment)) {
      this.showDepartmentCreateModal = false;
      this.currentEntityType = 'department';
      this.currentActionType = 'create';
      this.modalTitle = 'Confirm Creation';
      this.modalMessage = `Are you sure you want to create this Department?`;
      this.showDepartmentCreateConfirmModal = true;
    }
  }

  confirmDepartmentCreate(): void {
    const newId = Math.max(...this.departments.map(d => d.id || 0)) + 1;
    this.departments.push({ ...this.newDepartment, id: newId });
    this.showDepartmentCreateConfirmModal = false;
    this.modalTitle = 'Department Created';
    this.modalMessage = 'successfully';
    this.showDepartmentSuccessModal = true;
  }

  initiateDepartmentUpdate(): void {
    if (this.selectedDepartment && this.validateDepartmentForm(this.selectedDepartment)) {
      this.showDepartmentUpdateModal = false;
      this.currentEntityType = 'department';
      this.currentActionType = 'update';
      this.modalTitle = 'Confirm Update';
      this.modalMessage = `Are you sure you want to update this Department?`;
      this.showDepartmentUpdateConfirmModal = true;
    }
  }

  confirmDepartmentUpdate(): void {
    if (this.selectedDepartment) {
      const index = this.departments.findIndex(d => d.id === this.selectedDepartment!.id);
      if (index !== -1) { this.departments[index] = { ...this.selectedDepartment }; }
      this.showDepartmentUpdateConfirmModal = false;
      this.modalTitle = 'Department updated';
      this.modalMessage = 'successfully';
      this.showDepartmentSuccessModal = true;
    }
  }

  confirmDepartmentDelete(): void {
    if (this.selectedDepartment) {
      const index = this.departments.findIndex(d => d.id === this.selectedDepartment!.id);
      if (index !== -1) { this.departments.splice(index, 1); }
      this.showDepartmentDeleteConfirmModal = false;
      this.modalTitle = 'Department deleted';
      this.modalMessage = 'successfully';
      this.showDepartmentSuccessModal = true;
    }
  }

  validateDepartmentForm(department: Department): boolean {
    return !!department.name;
  }

  openAreaCreateModal(): void {
    this.newArea = { id: 0, name: '', departmentId: 0 };
    this.filteredDepartmentsForAreas = [...this.departments];
    this.showAreaCreateModal = true;
  }

  openAreaUpdateModal(area: Area): void {
    this.selectedArea = { ...area };
    this.filteredDepartmentsForAreas = [...this.departments];
    this.showAreaUpdateModal = true;
  }

  openAreaDeleteConfirmModal(area: Area): void {
    this.selectedArea = area;
    this.currentEntityType = 'area';
    this.currentActionType = 'delete';
    this.modalTitle = 'Confirm Deletion';
    this.modalMessage = `Are you sure you want to delete area "${area.name}"?`;
    this.showAreaDeleteConfirmModal = true;
  }

  initiateAreaCreate(): void {
    if (this.validateAreaForm(this.newArea)) {
      this.showAreaCreateModal = false;
      this.currentEntityType = 'area';
      this.currentActionType = 'create';
      this.modalTitle = 'Confirm Creation';
      this.modalMessage = `Are you sure you want to create this Area?`;
      this.showAreaCreateConfirmModal = true;
    }
  }

  confirmAreaCreate(): void {
    const newId = Math.max(...this.areas.map(a => a.id || 0)) + 1;
    this.areas.push({ ...this.newArea, id: newId });
    this.showAreaCreateConfirmModal = false;
    this.modalTitle = 'Area Created';
    this.modalMessage = 'successfully';
    this.showAreaSuccessModal = true;
  }

  initiateAreaUpdate(): void {
    if (this.selectedArea && this.validateAreaForm(this.selectedArea)) {
      this.showAreaUpdateModal = false;
      this.currentEntityType = 'area';
      this.currentActionType = 'update';
      this.modalTitle = 'Confirm Update';
      this.modalMessage = `Are you sure you want to update this Area?`;
      this.showAreaUpdateConfirmModal = true;
    }
  }

  confirmAreaUpdate(): void {
    if (this.selectedArea) {
      const index = this.areas.findIndex(a => a.id === this.selectedArea!.id);
      if (index !== -1) { this.areas[index] = { ...this.selectedArea }; }
      this.showAreaUpdateConfirmModal = false;
      this.modalTitle = 'Area updated';
      this.modalMessage = 'successfully';
      this.showAreaSuccessModal = true;
    }
  }

  confirmAreaDelete(): void {
    if (this.selectedArea) {
      const index = this.areas.findIndex(a => a.id === this.selectedArea!.id);
      if (index !== -1) { this.areas.splice(index, 1); }
      this.showAreaDeleteConfirmModal = false;
      this.modalTitle = 'Area deleted';
      this.modalMessage = 'successfully';
      this.showAreaSuccessModal = true;
    }
  }

  validateAreaForm(area: Area): boolean {
    return !!(area.name && area.departmentId);
  }

  openPositionCreateModal(): void {
    this.newPosition = { id: 0, name: '', areaId: 0 };
    this.filteredAreasForPositions = [...this.areas];
    this.showPositionCreateModal = true;
  }

  openPositionUpdateModal(position: Position): void {
    this.selectedPosition = { ...position };
    this.filteredAreasForPositions = [...this.areas];
    this.showPositionUpdateModal = true;
  }

  openPositionDeleteConfirmModal(position: Position): void {
    this.selectedPosition = position;
    this.currentEntityType = 'position';
    this.currentActionType = 'delete';
    this.modalTitle = 'Confirm Deletion';
    this.modalMessage = `Are you sure you want to delete position "${position.name}"?`;
    this.showPositionDeleteConfirmModal = true;
  }

  initiatePositionCreate(): void {
    if (this.validatePositionForm(this.newPosition)) {
      this.showPositionCreateModal = false;
      this.currentEntityType = 'position';
      this.currentActionType = 'create';
      this.modalTitle = 'Confirm Creation';
      this.modalMessage = `Are you sure you want to create this Position?`;
      this.showPositionCreateConfirmModal = true;
    }
  }

  confirmPositionCreate(): void {
    const newId = Math.max(...this.positions.map(p => p.id || 0)) + 1;
    this.positions.push({ ...this.newPosition, id: newId });
    this.showPositionCreateConfirmModal = false;
    this.modalTitle = 'Position Created';
    this.modalMessage = 'successfully';
    this.showPositionSuccessModal = true;
  }

  initiatePositionUpdate(): void {
    if (this.selectedPosition && this.validatePositionForm(this.selectedPosition)) {
      this.showPositionUpdateModal = false;
      this.currentEntityType = 'position';
      this.currentActionType = 'update';
      this.modalTitle = 'Confirm Update';
      this.modalMessage = `Are you sure you want to update this Position?`;
      this.showPositionUpdateConfirmModal = true;
    }
  }

  confirmPositionUpdate(): void {
    if (this.selectedPosition) {
      const index = this.positions.findIndex(p => p.id === this.selectedPosition!.id);
      if (index !== -1) { this.positions[index] = { ...this.selectedPosition }; }
      this.showPositionUpdateConfirmModal = false;
      this.modalTitle = 'Position updated';
      this.modalMessage = 'successfully';
      this.showPositionSuccessModal = true;
    }
  }

  confirmPositionDelete(): void {
    if (this.selectedPosition) {
      const index = this.positions.findIndex(p => p.id === this.selectedPosition!.id);
      if (index !== -1) { this.positions.splice(index, 1); }
      this.showPositionDeleteConfirmModal = false;
      this.modalTitle = 'Position deleted';
      this.modalMessage = 'successfully';
      this.showPositionSuccessModal = true;
    }
  }

  validatePositionForm(position: Position): boolean {
    return !!(position.name && position.areaId);
  }

  closeAllModals(): void {
    this.showTypologyCreateModal = false;
    this.showTypologyUpdateModal = false;
    this.showTypologyDeleteConfirmModal = false;
    this.showTypologyCreateConfirmModal = false;
    this.showTypologyUpdateConfirmModal = false;
    this.showTypologySuccessModal = false;

    this.showDepartmentCreateModal = false;
    this.showDepartmentUpdateModal = false;
    this.showDepartmentDeleteConfirmModal = false;
    this.showDepartmentCreateConfirmModal = false;
    this.showDepartmentUpdateConfirmModal = false;
    this.showDepartmentSuccessModal = false;

    this.showAreaCreateModal = false;
    this.showAreaUpdateModal = false;
    this.showAreaDeleteConfirmModal = false;
    this.showAreaCreateConfirmModal = false;
    this.showAreaUpdateConfirmModal = false;
    this.showAreaSuccessModal = false;

    this.showPositionCreateModal = false;
    this.showPositionUpdateModal = false;
    this.showPositionDeleteConfirmModal = false;
    this.showPositionCreateConfirmModal = false;
    this.showPositionUpdateConfirmModal = false;
    this.showPositionSuccessModal = false;

    this.selectedTypology = null;
    this.selectedDepartment = null;
    this.selectedArea = null;
    this.selectedPosition = null;
    this.currentEntityType = null;
    this.currentActionType = null;
  }

  cancelConfirmation(): void {
    if (this.currentEntityType === 'typology') {
      if (this.currentActionType === 'create') {
        this.showTypologyCreateConfirmModal = false;
        this.showTypologyCreateModal = true;
      } else if (this.currentActionType === 'update') {
        this.showTypologyUpdateConfirmModal = false;
        this.showTypologyUpdateModal = true;
      } else if (this.currentActionType === 'delete') {
        this.showTypologyDeleteConfirmModal = false;
      }
    } else if (this.currentEntityType === 'department') {
      if (this.currentActionType === 'create') {
        this.showDepartmentCreateConfirmModal = false;
        this.showDepartmentCreateModal = true;
      } else if (this.currentActionType === 'update') {
        this.showDepartmentUpdateConfirmModal = false;
        this.showDepartmentUpdateModal = true;
      } else if (this.currentActionType === 'delete') {
        this.showDepartmentDeleteConfirmModal = false;
      }
    } else if (this.currentEntityType === 'area') {
      if (this.currentActionType === 'create') {
        this.showAreaCreateConfirmModal = false;
        this.showAreaCreateModal = true;
      } else if (this.currentActionType === 'update') {
        this.showAreaUpdateConfirmModal = false;
        this.showAreaUpdateModal = true;
      } else if (this.currentActionType === 'delete') {
        this.showAreaDeleteConfirmModal = false;
      }
    } else if (this.currentEntityType === 'position') {
      if (this.currentActionType === 'create') {
        this.showPositionCreateConfirmModal = false;
        this.showPositionCreateModal = true;
      } else if (this.currentActionType === 'update') {
        this.showPositionUpdateConfirmModal = false;
        this.showPositionUpdateModal = true;
      } else if (this.currentActionType === 'delete') {
        this.showPositionDeleteConfirmModal = false;
      }
    }
    this.currentEntityType = null;
    this.currentActionType = null;
  }
}
