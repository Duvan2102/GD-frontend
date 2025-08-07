import { Component, Input, Output, EventEmitter, OnChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

export interface Area {
  idArea?: number;
  descripcion: string;
  departamento: { idDepartamento: number; descripcion?: string };
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
  @Input() departments: any[] = [];
  @Input() areaToEdit?: Area;

  @Output() create = new EventEmitter<Area>();
  @Output() update = new EventEmitter<Area>();
  @Output() cancel = new EventEmitter<void>();

  area: Area = { descripcion: '', departamento: { idDepartamento: 0 } };

  get modalTitle(): string {
    return this.mode === 'update' ? 'Actualización del Área' : 'Crear Área';
  }

  ngOnChanges() {
    if (this.isVisible) {
      if (this.mode === 'update' && this.areaToEdit) {
        this.area = { ...this.areaToEdit, departamento: { ...this.areaToEdit.departamento } };
      } else {
        this.resetForm();
      }
    }
  }

  onSubmit() {
    if (!this.area.descripcion.trim() || !this.area.departamento.idDepartamento) {
      return;
    }
    this.area.departamento.idDepartamento = Number(this.area.departamento.idDepartamento);
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
  }
}