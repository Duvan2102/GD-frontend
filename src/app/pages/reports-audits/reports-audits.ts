import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';

import { Controls } from '../approvals/controls/controls';
import { FooterControls } from '../approvals/footer-controls/footer-controls';

/**
 * Elemento de informe con sus campos obligatorios.
 */
interface ReportItem {
  id: string;
  tipoSolicitud: string;
  codificacion: string;
  fechaCreacion: Date;
  usuarioCreador: string;
  area: string;
  departamento: string;
  ultimaActualizacion: Date;
  estado: string;
  selected?: boolean;
}

/**
 * Campos válidos para ordenamiento (excluimos 'selected' opcional).
 */
type SortField = keyof Omit<ReportItem, 'selected'>;

@Component({
  selector: 'app-reports-audits',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    Controls,
    FooterControls
  ],
  templateUrl: './reports-audits.html',
  styleUrls: ['./reports-audits.css']
})
export class ReportsAudits implements OnInit {
  /** Todos los elementos (ej: desde un servicio) */
  allItems: ReportItem[] = [
    {
    id: '001',
    tipoSolicitud: 'VIATICOS',
    codificacion: 'TI-001',
    fechaCreacion: new Date('2025-03-26T12:00:00'),
    usuarioCreador: 'USUARIO.HELISA',
    area: 'EMPLEADO',
    departamento: 'EMPLEADO',
    ultimaActualizacion: new Date('2025-03-27T13:00:00'),
    estado: 'APROBADO'
  },
  {
    id: '002',
    tipoSolicitud: 'VIATICOS',
    codificacion: 'TI-001',
    fechaCreacion: new Date('2025-03-26T12:00:00'),
    usuarioCreador: 'USUARIO.HELISA',
    area: 'EMPLEADO',
    departamento: 'EMPLEADO',
    ultimaActualizacion: new Date('2025-03-27T13:00:00'),
    estado: 'APROBADO'
  },
  {
    id: '003',
    tipoSolicitud: 'REQUISICIONES',
    codificacion: 'TI-001',
    fechaCreacion: new Date('2025-03-26T12:00:00'),
    usuarioCreador: 'USUARIO.HELISA',
    area: 'EMPLEADO',
    departamento: 'EMPLEADO',
    ultimaActualizacion: new Date('2025-03-27T13:00:00'),
    estado: 'APROBADO'
  },
  {
    id: '004',
    tipoSolicitud: 'VIATICOS',
    codificacion: 'TI-001',
    fechaCreacion: new Date('2025-03-27T08:30:00'),
    usuarioCreador: 'ANA.ROJAS',
    area: 'ANALISTA',
    departamento: 'ANALISTA',
    ultimaActualizacion: new Date('2025-03-28T10:00:00'),
    estado: 'PENDIENTE'
  },
  {
    id: '005',
    tipoSolicitud: 'REQUISICIONES',
    codificacion: 'TI-001',
    fechaCreacion: new Date('2025-03-26T09:45:00'),
    usuarioCreador: 'CARLOS.DIAZ',
    area: 'JEFE DE ÁREA',
    departamento: 'JEFE DE ÁREA',
    ultimaActualizacion: new Date('2025-03-27T14:30:00'),
    estado: 'APROBADO'
  },
  {
    id: '006',
    tipoSolicitud: 'VIATICOS',
    codificacion: 'TI-001',
    fechaCreacion: new Date('2025-03-27T11:20:00'),
    usuarioCreador: 'MARIA.GOMEZ',
    area: 'EMPLEADO',
    departamento: 'EMPLEADO',
    ultimaActualizacion: new Date('2025-03-28T08:00:00'),
    estado: 'RECHAZADO'
  },
  {
    id: '007',
    tipoSolicitud: 'REQUISICIONES',
    codificacion: 'TI-001',
    fechaCreacion: new Date('2025-03-28T13:00:00'),
    usuarioCreador: 'JUAN.PEREZ',
    area: 'COORDINADOR',
    departamento: 'COORDINADOR',
    ultimaActualizacion: new Date('2025-03-29T16:00:00'),
    estado: 'PENDIENTE'
  },
  {
    id: '008',
    tipoSolicitud: 'VIATICOS',
    codificacion: 'TI-001',
    fechaCreacion: new Date('2025-03-29T15:30:00'),
    usuarioCreador: 'LUISA.MORA',
    area: 'SUPERVISOR',
    departamento: 'SUPERVISOR',
    ultimaActualizacion: new Date('2025-03-30T09:00:00'),
    estado: 'APROBADO'
  },
  {
    id: '009',
    tipoSolicitud: 'REQUISICIONES',
    codificacion: 'TI-001',
    fechaCreacion: new Date('2025-03-30T07:50:00'),
    usuarioCreador: 'FERNANDO.TORO',
    area: 'JEFE DE ÁREA',
    departamento: 'JEFE DE ÁREA',
    ultimaActualizacion: new Date('2025-03-30T17:00:00'),
    estado: 'APROBADO'
  },
  {
    id: '010',
    tipoSolicitud: 'VIATICOS',
    codificacion: 'TI-001',
    fechaCreacion: new Date('2025-04-01T10:15:00'),
    usuarioCreador: 'CLAUDIA.VERA',
    area: 'EMPLEADO',
    departamento: 'EMPLEADO',
    ultimaActualizacion: new Date('2025-04-01T14:00:00'),
    estado: 'RECHAZADO'
  },
  {
    id: '011',
    tipoSolicitud: 'REQUISICIONES',
    codificacion: 'TI-001',
    fechaCreacion: new Date('2025-04-02T08:10:00'),
    usuarioCreador: 'MARIO.SOSA',
    area: 'ANALISTA',
    departamento: 'ANALISTA',
    ultimaActualizacion: new Date('2025-04-02T16:30:00'),
    estado: 'PENDIENTE'
  },
  {
    id: '012',
    tipoSolicitud: 'VIATICOS',
    codificacion: 'TI-001',
    fechaCreacion: new Date('2025-04-03T09:20:00'),
    usuarioCreador: 'PATRICIA.OLIVER',
    area: 'SUPERVISOR',
    departamento: 'SUPERVISOR',
    ultimaActualizacion: new Date('2025-04-04T10:00:00'),
    estado: 'APROBADO'
  },
  {
    id: '013',
    tipoSolicitud: 'REQUISICIONES',
    codificacion: 'TI-001',
    fechaCreacion: new Date('2025-04-04T14:30:00'),
    usuarioCreador: 'GABRIELA.MENDEZ',
    area: 'JEFE DE ÁREA',
    departamento: 'JEFE DE ÁREA',
    ultimaActualizacion: new Date('2025-04-05T11:00:00'),
    estado: 'RECHAZADO'
  },
  {
    id: '014',
    tipoSolicitud: 'VIATICOS',
    codificacion: 'TI-001',
    fechaCreacion: new Date('2025-03-26T12:00:00'),
    usuarioCreador: 'USUARIO.HELISA',
    area: 'EMPLEADO',
    departamento: 'EMPLEADO',
    ultimaActualizacion: new Date('2025-03-27T13:00:00'),
    estado: 'APROBADO'
  },
  {
    id: '015',
    tipoSolicitud: 'VIATICOS',
    codificacion: 'TI-001',
    fechaCreacion: new Date('2025-03-26T12:00:00'),
    usuarioCreador: 'USUARIO.HELISA',
    area: 'EMPLEADO',
    departamento: 'EMPLEADO',
    ultimaActualizacion: new Date('2025-03-27T13:00:00'),
    estado: 'APROBADO'
  },
  {
    id: '016',
    tipoSolicitud: 'REQUISICIONES',
    codificacion: 'TI-001',
    fechaCreacion: new Date('2025-03-26T12:00:00'),
    usuarioCreador: 'USUARIO.HELISA',
    area: 'EMPLEADO',
    departamento: 'EMPLEADO',
    ultimaActualizacion: new Date('2025-03-27T13:00:00'),
    estado: 'APROBADO'
  },
  {
    id: '017',
    tipoSolicitud: 'VIATICOS',
    codificacion: 'TI-001',
    fechaCreacion: new Date('2025-03-27T08:30:00'),
    usuarioCreador: 'ANA.ROJAS',
    area: 'ANALISTA',
    departamento: 'ANALISTA',
    ultimaActualizacion: new Date('2025-03-28T10:00:00'),
    estado: 'PENDIENTE'
  },
  {
    id: '018',
    tipoSolicitud: 'REQUISICIONES',
    codificacion: 'TI-001',
    fechaCreacion: new Date('2025-03-26T09:45:00'),
    usuarioCreador: 'CARLOS.DIAZ',
    area: 'JEFE DE ÁREA',
    departamento: 'JEFE DE ÁREA',
    ultimaActualizacion: new Date('2025-03-27T14:30:00'),
    estado: 'APROBADO'
  },
  {
    id: '019',
    tipoSolicitud: 'VIATICOS',
    codificacion: 'TI-001',
    fechaCreacion: new Date('2025-03-27T11:20:00'),
    usuarioCreador: 'MARIA.GOMEZ',
    area: 'EMPLEADO',
    departamento: 'EMPLEADO',
    ultimaActualizacion: new Date('2025-03-28T08:00:00'),
    estado: 'RECHAZADO'
  },
  {
    id: '020',
    tipoSolicitud: 'REQUISICIONES',
    codificacion: 'TI-001',
    fechaCreacion: new Date('2025-03-28T13:00:00'),
    usuarioCreador: 'JUAN.PEREZ',
    area: 'COORDINADOR',
    departamento: 'COORDINADOR',
    ultimaActualizacion: new Date('2025-03-29T16:00:00'),
    estado: 'PENDIENTE'
  },
  {
    id: '021',
    tipoSolicitud: 'VIATICOS',
    codificacion: 'TI-001',
    fechaCreacion: new Date('2025-03-29T15:30:00'),
    usuarioCreador: 'LUISA.MORA',
    area: 'SUPERVISOR',
    departamento: 'SUPERVISOR',
    ultimaActualizacion: new Date('2025-03-30T09:00:00'),
    estado: 'APROBADO'
  },
  {
    id: '022',
    tipoSolicitud: 'REQUISICIONES',
    codificacion: 'TI-001',
    fechaCreacion: new Date('2025-03-30T07:50:00'),
    usuarioCreador: 'FERNANDO.TORO',
    area: 'JEFE DE ÁREA',
    departamento: 'JEFE DE ÁREA',
    ultimaActualizacion: new Date('2025-03-30T17:00:00'),
    estado: 'APROBADO'
  },
  {
    id: '023',
    tipoSolicitud: 'VIATICOS',
    codificacion: 'TI-001',
    fechaCreacion: new Date('2025-04-01T10:15:00'),
    usuarioCreador: 'CLAUDIA.VERA',
    area: 'EMPLEADO',
    departamento: 'EMPLEADO',
    ultimaActualizacion: new Date('2025-04-01T14:00:00'),
    estado: 'RECHAZADO'
  },
  {
    id: '024',
    tipoSolicitud: 'REQUISICIONES',
    codificacion: 'TI-001',
    fechaCreacion: new Date('2025-04-02T08:10:00'),
    usuarioCreador: 'MARIO.SOSA',
    area: 'ANALISTA',
    departamento: 'ANALISTA',
    ultimaActualizacion: new Date('2025-04-02T16:30:00'),
    estado: 'PENDIENTE'
  },
  {
    id: '025',
    tipoSolicitud: 'VIATICOS',
    codificacion: 'TI-001',
    fechaCreacion: new Date('2025-04-03T09:20:00'),
    usuarioCreador: 'PATRICIA.OLIVER',
    area: 'SUPERVISOR',
    departamento: 'SUPERVISOR',
    ultimaActualizacion: new Date('2025-04-04T10:00:00'),
    estado: 'APROBADO'
  },
  {
    id: '026',
    tipoSolicitud: 'REQUISICIONES',
    codificacion: 'TI-001',
    fechaCreacion: new Date('2025-04-04T14:30:00'),
    usuarioCreador: 'GABRIELA.MENDEZ',
    area: 'JEFE DE ÁREA',
    departamento: 'JEFE DE ÁREA',
    ultimaActualizacion: new Date('2025-04-05T11:00:00'),
    estado: 'RECHAZADO'
  }
];

  /** Array que se muestra en la tabla (filtrado + paginado) */
  displayedItems: ReportItem[] = [];
  private filteredItems: ReportItem[] = [];

  totalFiltered = 0;
  searchTerm = '';
  showOnlyApproved = false;
  currentPage = 1;
  itemsPerPage = 10;

  /** Campo de orden por defecto */
  currentOrder: SortField = 'fechaCreacion';
  ascendingOrder = false;

  ngOnInit(): void {
    this.applyViewLogic();
  }

  /** Aplica: filtrado, orden y paginación. */
  applyViewLogic(): void {
    // 1) Filtrar estado
    let result = [...this.allItems];
    if (this.showOnlyApproved) {
      result = result.filter(item => item.estado === 'APROBADO');
    }

    // 2) Filtrar por término de búsqueda
    if (this.searchTerm) {
      const term = this.searchTerm.toLowerCase();
      result = result.filter(item =>
        item.tipoSolicitud.toLowerCase().includes(term) ||
        item.usuarioCreador.toLowerCase().includes(term) ||
        item.id.toLowerCase().includes(term)
      );
    }

    this.filteredItems = result;
    this.totalFiltered = this.filteredItems.length;

    // 3) Ordenar según campo y dirección
    this.filteredItems.sort((a, b) => {
      const aVal = a[this.currentOrder];
      const bVal = b[this.currentOrder];
      if (aVal < bVal) {
        return this.ascendingOrder ? -1 : 1;
      }
      if (aVal > bVal) {
        return this.ascendingOrder ? 1 : -1;
      }
      return 0;
    });

    // 4) Paginación
    const start = (this.currentPage - 1) * this.itemsPerPage;
    this.displayedItems = this.filteredItems.slice(start, start + this.itemsPerPage);
  }

  onToggleApproved(value: boolean): void {
    this.showOnlyApproved = value;
    this.currentPage = 1;
    this.applyViewLogic();
  }

  onQuantityChange(quantity: number): void {
    this.itemsPerPage = quantity;
    this.currentPage = 1;
    this.applyViewLogic();
  }

  onSearchChange(term: string): void {
    this.searchTerm = term;
    this.currentPage = 1;
    this.applyViewLogic();
  }

  onChangePage(page: number): void {
    this.currentPage = page;
    this.applyViewLogic();
  }

  /** Cambia la dirección o el campo de orden */
  sortBy(field: SortField): void {
    if (this.currentOrder === field) {
      this.ascendingOrder = !this.ascendingOrder;
    } else {
      this.currentOrder = field;
      this.ascendingOrder = true;
    }
    this.applyViewLogic();
  }

  /** Seleccionar/desmarcar todos los checkboxes */
  toggleAll(event: Event): void {
    const checked = (event.target as HTMLInputElement).checked;
    this.displayedItems.forEach(item => item.selected = checked);
  }

  onManage(id: string): void {
    console.log('Gestionando solicitud con ID:', id);
  }
}
