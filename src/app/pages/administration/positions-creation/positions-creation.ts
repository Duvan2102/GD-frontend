import { Component, Input, Output, EventEmitter, OnChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Area } from '../../../services/area.service';

export interface Position {
  idCargo?: number;
  descripcion: string;
  area: Area;
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
  @Input() positions: Position[] = [];
  @Input() positionToEdit?: Position;
  @Input() areas: Area[] = [];

  @Output() create = new EventEmitter<Position>();
  @Output() update = new EventEmitter<Position>();
  @Output() cancel = new EventEmitter<void>();

  position: Position = {
    descripcion: '',
    area: { idArea: 0, descripcion: '', departamento: { idDepartamento: 0, descripcion: '' } }
  };

  get modalTitle(): string {
    return this.mode === 'update' ? 'Actualización del Cargo' : 'Crear Cargo';
  }

  ngOnChanges() {
    if (this.isVisible) {
      if (this.mode === 'update' && this.positionToEdit) {
        this.position = { ...this.positionToEdit, area: { ...this.positionToEdit.area } };
      } else {
        this.resetForm();
      }
    }
  }

  onSubmit() {
    if (!this.position.descripcion.trim() || !this.position.area.idArea) {
      return;
    }
    const selectedArea = this.areas.find(a => a.idArea === Number(this.position.area.idArea));
    if (selectedArea) {
      this.position.area = { ...selectedArea };
    }
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

  private resetForm() {
    this.position = {
      descripcion: '',
      area: { idArea: 0, descripcion: '', departamento: { idDepartamento: 0, descripcion: '' } }
    };
  }

  getSelectedAreaInfo(): Area | undefined {
    if (!this.position.area.idArea) return undefined;
    return this.areas.find(area => area.idArea === Number(this.position.area.idArea));
  }
}