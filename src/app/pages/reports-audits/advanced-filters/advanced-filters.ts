import { Component, EventEmitter, Input, Output, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DepartmentService, Department } from '../../../services/department.service';
import { TypologyService, Typology } from '../../../services/typology.service';
import { UserService } from '../../../services/user.service';
import { Usuario } from '../../../interfaces/common.interfaces';
import { Subscription } from 'rxjs';

export interface FilterData {
  fechaDesde: string; // Si hay filtros "TODOS", se establece automáticamente a '2025-01-01'
  fechaHasta: string; // Si hay filtros "TODOS", se establece automáticamente a fecha actual
  estado: string;
  tipoSolicitud: string;
  solicitante: string;
  departamento: string;
  busqueda: string;
}

@Component({
  selector: 'app-advanced-filters',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './advanced-filters.html',
  styleUrls: ['./advanced-filters.css']
})
export class AdvancedFilters implements OnInit, OnDestroy {
  @Input() fechaDesde: string = '';
  @Input() fechaHasta: string = '';
  @Input() estadoSeleccionado: string = '';
  @Input() tipoSolicitudSeleccionado: string = '';
  @Input() solicitanteSeleccionado: string = '';
  @Input() departamentoSeleccionado: string = '';
  @Input() busqueda: string = '';

  @Output() filterChange = new EventEmitter<FilterData>();
  @Output() quantityChange = new EventEmitter<number>();
  @Output() clearAll = new EventEmitter<void>();
  @Output() loadAllApprovals = new EventEmitter<void>();

  departamentos: Department[] = [];
  usuarios: Usuario[] = [];
  tiposSolicitud: string[] = [];
  selectedQuantity: number = 10;
  private subscriptions: Subscription[] = [];

  constructor(
    private departmentService: DepartmentService,
    private typologyService: TypologyService,
    private userService: UserService
  ) {}

  ngOnInit(): void {
    this.loadDepartamentos();
    this.loadUsuarios();
    this.loadTiposSolicitud();
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach(sub => sub.unsubscribe());
  }

  private loadDepartamentos(): void {
    const deptSub = this.departmentService.getAll().subscribe({
      next: (departamentos) => {
        this.departamentos = departamentos;
      },
      error: (error) => {
        console.error('Error cargando departamentos:', error);
      }
    });
    this.subscriptions.push(deptSub);
  }

  private loadUsuarios(): void {
    const userSub = this.userService.obtenerUsuarios().subscribe({
      next: (usuarios) => {
        this.usuarios = usuarios;
      },
      error: (error) => {
        console.error('Error cargando usuarios:', error);
      }
    });
    this.subscriptions.push(userSub);
  }

  private loadTiposSolicitud(): void {
    const typologySub = this.typologyService.getAll().subscribe({
      next: (tipologias: Typology[]) => {
        this.tiposSolicitud = tipologias.map(t => t.descripcion).filter((value, index, self) => 
          self.indexOf(value) === index
        );
      },
      error: (error) => {
        console.error('Error cargando tipologías:', error);
      }
    });
    this.subscriptions.push(typologySub);
  }

  onFilterChange(): void {
    // Verificar si TODOS los filtros están en "TODOS" o vacíos
    if (this.areAllFiltersSetToAll()) {
      console.log('🎯 Todos los filtros están en "TODOS" - Emitiendo evento para cargar todas las solicitudes');
      this.loadAllApprovals.emit();
      return;
    }
    
    // Si se selecciona "TODOS" en cualquier filtro, aplicar rango de fechas amplio
    const filterData: FilterData = {
      fechaDesde: this.getFechaDesde(),
      fechaHasta: this.getFechaHasta(),
      estado: this.estadoSeleccionado,
      tipoSolicitud: this.tipoSolicitudSeleccionado,
      solicitante: this.solicitanteSeleccionado,
      departamento: this.departamentoSeleccionado,
      busqueda: this.busqueda
    };
    // Forzar la emisión del evento incluso si los valores son los mismos
    setTimeout(() => {
      this.filterChange.emit(filterData);
    }, 0);
  }

  private getFechaDesde(): string {
    // Si hay filtros específicos seleccionados, usar las fechas del usuario
    if (this.fechaDesde && this.fechaDesde.trim() !== '') {
      return this.fechaDesde;
    }
    
    // Si se selecciona "TODOS" en cualquier filtro, usar fecha amplia
    if (this.isAnyFilterSetToAll()) {
      return '2025-01-01';
    }
    
    return this.fechaDesde;
  }

  private getFechaHasta(): string {
    // Si hay filtros específicos seleccionados, usar las fechas del usuario
    if (this.fechaHasta && this.fechaHasta.trim() !== '') {
      return this.fechaHasta;
    }
    
    // Si se selecciona "TODOS" en cualquier filtro, usar fecha actual
    if (this.isAnyFilterSetToAll()) {
      return new Date().toISOString().split('T')[0];
    }
    
    return this.fechaHasta;
  }

  private isAnyFilterSetToAll(): boolean {
    return this.estadoSeleccionado === 'TODOS' ||
           this.tipoSolicitudSeleccionado === 'TODOS' ||
           this.solicitanteSeleccionado === 'TODOS' ||
           this.departamentoSeleccionado === 'TODOS';
  }

  private areAllFiltersSetToAll(): boolean {
    return (
      (!this.estadoSeleccionado || this.estadoSeleccionado === '' || this.estadoSeleccionado === 'TODOS') &&
      (!this.tipoSolicitudSeleccionado || this.tipoSolicitudSeleccionado === '' || this.tipoSolicitudSeleccionado === 'TODOS') &&
      (!this.solicitanteSeleccionado || this.solicitanteSeleccionado === '' || this.solicitanteSeleccionado === 'TODOS') &&
      (!this.departamentoSeleccionado || this.departamentoSeleccionado === '' || this.departamentoSeleccionado === 'TODOS') &&
      (!this.fechaDesde || this.fechaDesde === '') &&
      (!this.fechaHasta || this.fechaHasta === '') &&
      (!this.busqueda || this.busqueda === '')
    );
  }

  clearFilters(): void {
    this.fechaDesde = '';
    this.fechaHasta = '';
    this.estadoSeleccionado = '';
    this.tipoSolicitudSeleccionado = '';
    this.solicitanteSeleccionado = '';
    this.departamentoSeleccionado = '';
    this.busqueda = '';
    
    // Al limpiar todos los filtros, cargar todas las solicitudes
    console.log('🧹 Filtros limpiados - Cargando todas las solicitudes');
    this.loadAllApprovals.emit();
    this.clearAll.emit();
  }

  onQuantityChange(quantity: number): void {
    this.quantityChange.emit(quantity);
  }

  onQuantityChangeToParent(): void {
    this.quantityChange.emit(this.selectedQuantity);
  }
}
