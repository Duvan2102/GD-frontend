// administration.ts

import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DepartmentCreation } from './department-creation/department-creation';
import { ConfirmModal } from '../users/confirm-modal/confirm-modal';
import { SuccessModal } from '../users/success-modal/success-modal';
import { Department, DepartmentService } from '../../services/department.service';
import { AreaService, Area } from '../../services/area.service';
import { AreaCreation } from './area-creation/area-creation';
import { PositionsCreation } from './positions-creation/positions-creation';
import { PositionService, Position } from '../../services/positions.service';
import { TypologyService, Typology } from '../../services/typology.service';
import { Tipology } from './tipology-creation/tipology-creation';

@Component({
  standalone: true,
  selector: 'app-administration',
  templateUrl: './administration.html',
  styleUrls: ['./administration.css'],
  imports: [
    CommonModule, FormsModule,
    DepartmentCreation, ConfirmModal, SuccessModal, AreaCreation, PositionsCreation, Tipology
  ]
})
export class Administration implements OnInit {
  typologiesExpanded = false;
  departmentsExpanded = false;
  areasExpanded = false;
  positionsExpanded = false;

  typologies: Typology[] = [];
  departments: Department[] = [];
  areas: Area[] = [];
  positions: Position[] = [];

  showTypologyCreateModal = false;
  showTypologyUpdateModal = false;
  showDepartmentCreateModal = false;
  showAreaCreateModal = false;
  showAreaUpdateModal = false;
  showPositionCreateModal = false;
  showDepartmentUpdateModal = false;
  showPositionUpdateModal = false;

  confirmModalVisible = false;
  confirmModalMessage = '';
  private confirmModalCallback: (() => void) | null = null;

  modalSuccessVisible = false;
  modalSuccessMessage = '';
  modalSuccessBtn = 'Aceptar';

  newDepartment: Department = { idDepartamento: 0, descripcion: '' };
  selectedTypology?: Typology;
  selectedDepartment?: Department;
  selectedArea?: Area;
  selectedPosition?: Position;
  newArea: Area = { descripcion: '', departamento: { idDepartamento: 0, descripcion: '' } };

  constructor(
    private departmentService: DepartmentService,
    private areaService: AreaService,
    private positionService: PositionService,
    private typologyService: TypologyService
  ) {}

  ngOnInit(): void {
    this.loadAllData();
  }

  loadAllData(): void {
    this.loadDepartments();
    this.loadAreas();
    this.loadPositions();
    this.loadTypologies();
  }

  loadDepartments() {
    this.departmentService.getAll().subscribe({
      next: (data: Department[]) => this.departments = data,
      error: (error) => this.mostrarModalError('Error al cargar departamentos', error)
    });
  }

  loadAreas() {
    this.areaService.getAll().subscribe({
      next: (data: Area[]) => this.areas = data,
      error: (error) => this.mostrarModalError('Error al cargar áreas', error)
    });
  }

  loadPositions() {
    this.positionService.getAll().subscribe({
      next: (data: Position[]) => this.positions = data,
      error: (error) => this.mostrarModalError('Error al cargar cargos', error)
    });
  }

  loadTypologies() {
    this.typologyService.getAll().subscribe({
      next: (data: Typology[]) => this.typologies = data,
      error: (error) => this.mostrarModalError('Error al cargar tipologías', error)
    });
  }

  getAssociatedName(id: number, list: any[], key: string): string {
    const item = list.find(item => item.idDepartamento === id);
    return item ? item[key] : 'N/A';
  }

  toggleTypologies() {
    this.typologiesExpanded = !this.typologiesExpanded;
    if (this.typologiesExpanded) {
      this.departmentsExpanded = false;
      this.areasExpanded = false;
      this.positionsExpanded = false;
    }
  }

  toggleDepartments() {
    this.departmentsExpanded = !this.departmentsExpanded;
    if (this.departmentsExpanded) {
      this.typologiesExpanded = false;
      this.areasExpanded = false;
      this.positionsExpanded = false;
    }
  }

  toggleAreas() {
    this.areasExpanded = !this.areasExpanded;
    if (this.areasExpanded) {
      this.typologiesExpanded = false;
      this.departmentsExpanded = false;
      this.positionsExpanded = false;
    }
  }

  togglePositions() {
    this.positionsExpanded = !this.positionsExpanded;
    if (this.positionsExpanded) {
      this.typologiesExpanded = false;
      this.departmentsExpanded = false;
      this.areasExpanded = false;
    }
  }

  private showConfirmModal(message: string, callback: () => void): void {
    this.confirmModalMessage = message;
    this.confirmModalVisible = true;
    this.confirmModalCallback = callback;
  }

  onAceptarConfirmacion(): void {
    if (this.confirmModalCallback) this.confirmModalCallback();
    this.confirmModalVisible = false;
    this.confirmModalCallback = null;
  }

  onCancelarConfirmacion(): void {
    this.confirmModalVisible = false;
    this.confirmModalCallback = null;
  }

  mostrarModalSuccess(mensaje: string, textoBtn: string = 'Aceptar') {
    this.modalSuccessMessage = mensaje;
    this.modalSuccessBtn = textoBtn;
    this.modalSuccessVisible = true;
  }
  
  mostrarModalError(mensaje: string, error?: any) {
    let errorMsg = mensaje;
    if (error) {
      if (error.status === 400) {
        errorMsg = 'Solicitud inválida: ' + (error.error?.message || mensaje);
      } else if (error.status === 404) {
        errorMsg = 'No se encontró el recurso solicitado.';
      } else if (error.status === 409 && error.error?.message) {
        errorMsg = error.error.message;
      } else if (error.status === 409) {
        errorMsg = 'Conflicto: El registro ya existe o está en uso.';
      } else if (error.status === 500) {
        errorMsg = 'Error interno del servidor. Intente más tarde.';
      } else if (error.error?.message) {
        errorMsg = error.error.message;
      }
    }
    this.mostrarModalSuccess(errorMsg, 'Cerrar');
  }

  cerrarModalSuccess() {
    this.modalSuccessVisible = false;
  }

  // --- Typology ---
  openTypologyCreateModal() {
    this.selectedTypology = undefined;
    this.showTypologyCreateModal = true;
  }
  openTypologyUpdateModal(typology: Typology) {
    this.selectedTypology = { ...typology };
    this.showTypologyUpdateModal = true;
  }
  openTypologyDeleteConfirmModal(typology: Typology) {
    this.showConfirmModal(`¿Eliminar tipología "${typology.descripcion}"?`, () => {
      if (!typology.idTipologia) return;
      this.typologyService.delete(typology.idTipologia).subscribe({
        next: () => {
          this.loadTypologies();
          this.mostrarModalSuccess('Tipología eliminada con éxito');
        },
        error: (error) => {
          this.typologyService.getById(typology.idTipologia!).subscribe({
            next: () => {
              // Si aún existe, error real
              this.mostrarModalError('Error al eliminar la tipología. Es posible que esté en uso.', error);
            },
            error: () => {
              // Si ya no existe, se asume borrada
              this.loadTypologies();
              this.mostrarModalSuccess('Tipología eliminada con éxito');
            }
          });
        }
      });
    });
  }
  crearTipologia(typology: Partial<Typology>) {
    this.typologyService.create(typology).subscribe({
      next: () => {
        this.loadTypologies();
        this.showTypologyCreateModal = false;
        this.mostrarModalSuccess('Tipología creada con éxito');
      },
      error: (error) => this.mostrarModalError('Error al crear la tipología.', error)
    });
  }
  actualizarTipologia(typology: Typology) {
    if (!typology.idTipologia) return;
    const updatePayload: Partial<Typology> = {
        descripcion: typology.descripcion,
        cargo: typology.cargo ? { idCargo: typology.cargo.idCargo } as Position : undefined
    };
    this.typologyService.update(typology.idTipologia, updatePayload).subscribe({
      next: () => {
        this.loadTypologies();
        this.showTypologyUpdateModal = false;
        this.selectedTypology = undefined;
        this.mostrarModalSuccess('Tipología actualizada con éxito');
      },
      error: (error) => this.mostrarModalError('Error al actualizar la tipología.', error)
    });
  }
  closeTypologyModal() {
    this.showTypologyCreateModal = false;
    this.showTypologyUpdateModal = false;
    this.selectedTypology = undefined;
  }

  // --- Department ---
  openDepartmentCreateModal() {
    this.newDepartment = { idDepartamento: 0, descripcion: '' };
    this.showDepartmentCreateModal = true;
  }
  openDepartmentUpdateModal(department: Department) {
    this.selectedDepartment = { ...department };
    this.showDepartmentUpdateModal = true;
  }
  confirmDepartmentCreate(nombre: string): void {
    if (!nombre?.trim()) return;
    const newDepartment: Partial<Department> = { descripcion: nombre.trim() };
    this.departmentService.create(newDepartment).subscribe({
        next: () => {
            this.loadDepartments();
            this.closeDepartmentModal();
            this.mostrarModalSuccess('Departamento creado con éxito');
        },
        error: (error) => this.mostrarModalError('Error al crear el departamento.', error)
    });
  }
  confirmDepartmentUpdate(department: Department): void {
    if (!department.descripcion.trim() || !department.idDepartamento) return;
    
    const departmentId = Number(department.idDepartamento);
    if (isNaN(departmentId)) {
        this.mostrarModalError('El ID del departamento no es válido.');
        return;
    }

    this.departmentService.update(departmentId, { ...department, idDepartamento: departmentId }).subscribe({
        next: () => {
            this.loadDepartments();
            this.closeDepartmentModal();
            this.mostrarModalSuccess('Departamento actualizado con éxito');
        },
        error: (error) => this.mostrarModalError('Error al editar el departamento.', error)
    });
  }
  openDepartmentDeleteConfirmModal(department: Department) {
    this.showConfirmModal(`¿Eliminar departamento "${department.descripcion}"?`, () => {
      const departmentId = Number(department.idDepartamento);
      if (isNaN(departmentId)) return;

      this.departmentService.delete(departmentId).subscribe({
        next: () => {
          this.loadDepartments();
          this.mostrarModalSuccess('Departamento eliminado con éxito');
        },
        error: (error) => {
          this.departmentService.getById(departmentId).subscribe({
            next: () => {
              this.mostrarModalError('Error al eliminar el departamento. Es posible que esté en uso.', error);
            },
            error: () => {
              this.loadDepartments();
              this.mostrarModalSuccess('Departamento eliminado con éxito');
            }
          });
        }
      });
    });
  }
  closeDepartmentModal() {
    this.showDepartmentCreateModal = false;
    this.showDepartmentUpdateModal = false;
    this.newDepartment = { idDepartamento: 0, descripcion: '' };
    this.selectedDepartment = undefined;
  }

  // --- Area ---
  openAreaCreateModal() {
    this.newArea = { descripcion: '', departamento: { idDepartamento: 0, descripcion: '' } };
    this.showAreaCreateModal = true;
  }
  openAreaUpdateModal(area: Area) {
    this.selectedArea = { ...area, departamento: { ...area.departamento } };
    this.showAreaUpdateModal = true;
  }
  confirmAreaCreate(area: Area): void {
    if (!area.descripcion.trim() || !area.departamento?.idDepartamento) return;
    this.areaService.create(area).subscribe({
        next: () => {
            this.loadAreas();
            this.showAreaCreateModal = false;
            this.mostrarModalSuccess('Área creada exitosamente');
        },
        error: (error) => this.mostrarModalError('Error al crear el área.', error)
    });
  }
  confirmAreaUpdate(area: Area): void {
    if (!area.idArea || !area.descripcion.trim() || !area.departamento?.idDepartamento) return;
    
    const areaId = Number(area.idArea);
    const departmentId = Number(area.departamento.idDepartamento);

    if (isNaN(areaId) || isNaN(departmentId)) {
        this.mostrarModalError('El ID del área o departamento no es válido.');
        return;
    }
  
    const areaToUpdate = {
        ...area,
        idArea: areaId,
        departamento: { ...area.departamento, idDepartamento: departmentId }
    };

    this.areaService.update(areaId, areaToUpdate).subscribe({
        next: () => {
            this.loadAreas();
            this.showAreaUpdateModal = false;
            this.selectedArea = undefined;
            this.mostrarModalSuccess('Área actualizada exitosamente');
        },
        error: (error) => this.mostrarModalError('Error al editar el área.', error)
    });
  }
  openAreaDeleteConfirmModal(area: Area) {
    this.showConfirmModal(`¿Eliminar área "${area.descripcion}"?`, () => {
      const areaId = Number(area.idArea);
      if (isNaN(areaId)) return;

      this.areaService.delete(areaId).subscribe({
        next: () => {
          this.loadAreas();
          this.mostrarModalSuccess('Área eliminada con éxito');
        },
        error: (error) => {
          this.areaService.getById(areaId).subscribe({
            next: () => {
              this.mostrarModalError('Error al eliminar el área. Es posible que esté en uso.', error);
            },
            error: () => {
              this.loadAreas();
              this.mostrarModalSuccess('Área eliminada con éxito');
            }
          });
        }
      });
    });
  }

  // --- Position ---
  openPositionCreateModal() {
    this.showPositionCreateModal = true;
  }
  openPositionUpdateModal(position: Position) {
    this.selectedPosition = { ...position, area: { ...position.area, departamento: { ...position.area.departamento } } };
    this.showPositionUpdateModal = true;
  }
  confirmPositionCreate(position: Position): void {
    if (!position.descripcion.trim() || !position.area?.idArea) return;
    const areaCompleta = this.areas.find(a => a.idArea === position.area.idArea);
    if (!areaCompleta) {
        this.mostrarModalError('Debe seleccionar un área válida');
        return;
    }
    const positionToCreate: Position = {
        descripcion: position.descripcion,
        area: { ...areaCompleta }
    };
    this.positionService.create(positionToCreate).subscribe({
        next: () => {
            this.loadPositions();
            this.showPositionCreateModal = false;
            this.mostrarModalSuccess('Cargo creado exitosamente');
        },
        error: (error) => this.mostrarModalError('Error al crear el cargo.', error)
    });
  }
  confirmPositionUpdate(position: Position): void {
    if (!position.idCargo || !position.descripcion.trim() || !position.area?.idArea) return;
    const areaCompleta = this.areas.find(a => a.idArea === position.area.idArea);
    const positionToUpdate: Position = {
        idCargo: position.idCargo,
        descripcion: position.descripcion,
        area: areaCompleta ? { ...areaCompleta } : { ...position.area }
    };
    
    const positionId = Number(position.idCargo);
    if (isNaN(positionId)) return;

    this.positionService.update(positionId, positionToUpdate).subscribe({
        next: () => {
            this.loadPositions();
            this.showPositionUpdateModal = false;
            this.selectedPosition = undefined;
            this.mostrarModalSuccess('Cargo actualizado exitosamente');
        },
        error: (error) => this.mostrarModalError('Error al editar el cargo.', error)
    });
  }
  openPositionDeleteConfirmModal(position: Position) {
    this.showConfirmModal(`¿Eliminar cargo "${position.descripcion}"?`, () => {
      const positionId = Number(position.idCargo);
      if (isNaN(positionId)) return;

      this.positionService.delete(positionId).subscribe({
        next: () => {
          this.loadPositions();
          this.mostrarModalSuccess('Cargo eliminado con éxito');
        },
        error: (error) => {
          this.positionService.getById(positionId).subscribe({
            next: () => {
              this.mostrarModalError('Error al eliminar el cargo. Es posible que esté en uso.', error);
            },
            error: () => {
              this.loadPositions();
              this.mostrarModalSuccess('Cargo eliminado con éxito');
            }
          });
        }
      });
    });
  }
  closePositionModal() {
    this.showPositionCreateModal = false;
    this.showPositionUpdateModal = false;
    this.selectedPosition = undefined;
  }
}
