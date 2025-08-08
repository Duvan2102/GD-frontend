import { Component, Input, Output, EventEmitter, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Typology } from '../../../services/typology.service';
import { Department } from '../../../services/department.service';
import { Area } from '../../../services/area.service';
import { Position } from '../../../services/positions.service';

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

  @Output() create = new EventEmitter<Partial<Typology>>();
  @Output() update = new EventEmitter<Typology>();
  @Output() cancel = new EventEmitter<void>();

  descripcion = '';
  selectedDepartment?: Department;
  filteredAreas: Area[] = [];
  selectedArea?: Area;
  filteredPositions: Position[] = [];
  selectedPosition?: Position;

  get modalTitle(): string {
    return this.mode === 'update' ? 'Actualización de la Tipología' : 'Crear Tipología';
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['isVisible'] && this.isVisible) {
      if (this.mode === 'update' && this.typologyToEdit) {
        this.descripcion = this.typologyToEdit.descripcion;
        if (this.typologyToEdit.cargo) {
          const { cargo } = this.typologyToEdit;
          const { area } = cargo;
          const { departamento } = area;

          this.selectedDepartment = this.departments.find(d => d.idDepartamento === departamento.idDepartamento);
          if (this.selectedDepartment) {
            this.onDepartmentSelect(this.selectedDepartment);
            this.selectedArea = this.areas.find(a => a.idArea === area.idArea);
            if (this.selectedArea) {
              this.onAreaSelect(this.selectedArea);
              this.selectedPosition = this.positions.find(p => p.idCargo === cargo.idCargo);
            }
          }
        }
      } else {
        this.resetForm();
      }
    }
  }

  onDepartmentSelect(department: Department) {
    this.filteredAreas = this.areas.filter(area => area.departamento.idDepartamento === department.idDepartamento);
    this.selectedArea = undefined;
    this.filteredPositions = [];
    this.selectedPosition = undefined;
  }

  onAreaSelect(area: Area) {
    this.filteredPositions = this.positions.filter(pos => pos.area.idArea === area.idArea);
    this.selectedPosition = undefined;
  }

  onSubmit() {
    if (!this.descripcion.trim() || !this.selectedDepartment) return;

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
    this.filteredAreas = [];
    this.selectedArea = undefined;
    this.filteredPositions = [];
    this.selectedPosition = undefined;
  }
}