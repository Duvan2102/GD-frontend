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

  /**
   * Normaliza un texto eliminando tildes, convirtiendo a minúsculas y eliminando espacios extras
   * para realizar comparaciones consistentes
   */
  private normalizeText(text: string): string {
    if (!text) return '';
    return text
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim()
      .replace(/\s+/g, ' ');
  }


  private validateContainsLetters(text: string): boolean {
    const trimmed = text.trim();
    return /[a-záéíóúñA-ZÁÉÍÓÚÑ]/.test(trimmed);
  }

  private existeDuplicado(nombre: string, lista: any[], idActual?: number, campoId: string = 'id', campoNombre: string = 'descripcion'): boolean {
    const nombreNormalizado = this.normalizeText(nombre);
    return lista.some(item => {
      const esElMismo = idActual !== undefined && item[campoId] === idActual;
      if (esElMismo) return false;
      return this.normalizeText(item[campoNombre]) === nombreNormalizado;
    });
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
      if (error.error && typeof error.error === 'string') {
        errorMsg = error.error;
      } else if (error.error?.message) {
        errorMsg = error.error.message;
      } else if (error.message) {
        errorMsg = error.message;
      } else if (error.body?.message) {
        errorMsg = error.body.message;
      } else if (error.status === 400) {
        errorMsg = mensaje || 'Solicitud inválida. Verifique los datos ingresados.';
      } else if (error.status === 404) {
        errorMsg = 'No se encontró el recurso solicitado.';
      } else if (error.status === 409) {
        errorMsg = 'El registro ya existe o está en uso.';
      } else if (error.status === 500) {
        errorMsg = 'Error al procesar la solicitud. Por favor, intente nuevamente.';
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
          this.loadAllData();
          this.mostrarModalSuccess('Tipología eliminada con éxito');
        },
        error: (error) => {
          this.typologyService.getById(typology.idTipologia!).subscribe({
            next: () => {
              // Si aún existe, error real
              this.mostrarModalError('La Tipología no puede eliminarse porque tiene solicitudes asociadas.', error);
            },
            error: () => {
              // Si ya no existe, se asume borrada
              this.loadAllData();
              this.mostrarModalSuccess('Tipología eliminada con éxito');
            }
          });
        }
      });
    });
  }
  crearTipologia(typology: Partial<Typology>) {
    if (typology.descripcion && !this.validateContainsLetters(typology.descripcion)) {
      this.mostrarModalError('El nombre de la tipología debe contener al menos una letra, no puede ser solo números.');
      return;
    }

    if (typology.descripcion && this.existeDuplicado(typology.descripcion, this.typologies, undefined, 'idTipologia', 'descripcion')) {
      this.mostrarModalError('Nombre duplicado. Ya existe una tipología con ese nombre.');
      return;
    }

    this.typologyService.create(typology).subscribe({
      next: () => {
        this.loadAllData();
        this.showTypologyCreateModal = false;
        this.mostrarModalSuccess('Tipología creada con éxito');
      },
      error: (error) => this.mostrarModalError('Error al crear la tipología.', error)
    });
  }
  actualizarTipologia(typology: Typology) {
    if (!typology.idTipologia) return;
    
    if (!this.validateContainsLetters(typology.descripcion)) {
      this.mostrarModalError('El nombre de la tipología debe contener al menos una letra, no puede ser solo números.');
      return;
    }

    if (this.existeDuplicado(typology.descripcion, this.typologies, typology.idTipologia, 'idTipologia', 'descripcion')) {
      this.mostrarModalError('Nombre duplicado. Ya existe una tipología con ese nombre.');
      return;
    }

    const updatePayload: Partial<Typology> = {
        descripcion: typology.descripcion,
        cargo: typology.cargo ? { idCargo: typology.cargo.idCargo } as Position : undefined
    };
    this.typologyService.update(typology.idTipologia, updatePayload).subscribe({
      next: () => {
        this.loadAllData();
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
    
    if (this.existeDuplicado(nombre.trim(), this.departments, undefined, 'idDepartamento', 'descripcion')) {
      this.mostrarModalError('Nombre duplicado. Ya existe un departamento con ese nombre.');
      return;
    }

    const newDepartment: Partial<Department> = { descripcion: nombre.trim() };
    this.departmentService.create(newDepartment).subscribe({
        next: () => {
            this.loadAllData();
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

    if (this.existeDuplicado(department.descripcion.trim(), this.departments, departmentId, 'idDepartamento', 'descripcion')) {
      this.mostrarModalError('Nombre duplicado. Ya existe un departamento con ese nombre.');
      return;
    }

    this.departmentService.update(departmentId, { ...department, idDepartamento: departmentId }).subscribe({
        next: () => {
            this.loadAllData();
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
          this.loadAllData();
          this.mostrarModalSuccess('Departamento eliminado con éxito');
        },
        error: (error) => {
          this.departmentService.getById(departmentId).subscribe({
            next: () => {
              this.mostrarModalError('El Departamento no puede eliminarse porque tiene solicitudes asociadas.', error);
            },
            error: () => {
              this.loadAllData();
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
    
    if (this.existeDuplicado(area.descripcion.trim(), this.areas, undefined, 'idArea', 'descripcion')) {
      this.mostrarModalError('Nombre duplicado. Ya existe un área con ese nombre.');
      return;
    }

    this.areaService.create(area).subscribe({
        next: () => {
            this.loadAllData();
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

    if (this.existeDuplicado(area.descripcion.trim(), this.areas, areaId, 'idArea', 'descripcion')) {
      this.mostrarModalError('Nombre duplicado. Ya existe un área con ese nombre.');
      return;
    }
  
    const areaToUpdate = {
        ...area,
        idArea: areaId,
        departamento: { ...area.departamento, idDepartamento: departmentId }
    };

    this.areaService.update(areaId, areaToUpdate).subscribe({
        next: () => {
            this.loadAllData();
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
          this.loadAllData();
          this.mostrarModalSuccess('Área eliminada con éxito');
        },
        error: (error) => {
          this.areaService.getById(areaId).subscribe({
            next: () => {
              this.mostrarModalError('El Área no puede eliminarse porque tiene solicitudes asociadas.', error);
            },
            error: () => {
              this.loadAllData();
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
    
    if (this.existeDuplicado(position.descripcion.trim(), this.positions, undefined, 'idCargo', 'descripcion')) {
      this.mostrarModalError('Nombre duplicado. Ya existe un cargo con ese nombre.');
      return;
    }

    const positionToCreate: Position = {
        descripcion: position.descripcion,
        area: { ...areaCompleta }
    };
    this.positionService.create(positionToCreate).subscribe({
        next: () => {
            this.loadAllData();
            this.showPositionCreateModal = false;
            this.mostrarModalSuccess('Cargo creado exitosamente');
        },
        error: (error) => this.mostrarModalError('Error al crear el cargo.', error)
    });
  }
  confirmPositionUpdate(position: Position): void {
    if (!position.idCargo || !position.descripcion.trim() || !position.area?.idArea) return;
    
    const positionId = Number(position.idCargo);
    if (isNaN(positionId)) return;

    if (this.existeDuplicado(position.descripcion.trim(), this.positions, positionId, 'idCargo', 'descripcion')) {
      this.mostrarModalError('Nombre duplicado. Ya existe un cargo con ese nombre.');
      return;
    }

    const areaCompleta = this.areas.find(a => a.idArea === position.area.idArea);
    const positionToUpdate: Position = {
        idCargo: position.idCargo,
        descripcion: position.descripcion,
        area: areaCompleta ? { ...areaCompleta } : { ...position.area }
    };

    this.positionService.update(positionId, positionToUpdate).subscribe({
        next: () => {
            this.loadAllData();
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
          this.loadAllData();
          this.mostrarModalSuccess('Cargo eliminado con éxito');
        },
        error: (error) => {
          this.positionService.getById(positionId).subscribe({
            next: () => {
              this.mostrarModalError('El Cargo no puede eliminarse porque tiene solicitudes asociadas.', error);
            },
            error: () => {
              this.loadAllData();
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
