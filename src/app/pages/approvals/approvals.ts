import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';

import { Controls } from './controls/controls';
import { RequestsTable } from './requests-table/requests-table';
import { FooterControls } from './footer-controls/footer-controls';

@Component({
  selector: 'app-approvals',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    Controls,
    RequestsTable,
    FooterControls
  ],
  templateUrl: './approvals.html',
  styleUrls: ['./approvals.css']
})
export class Approvals implements OnInit {
  approvalsList = [
    { type: 'VIATICOS', id: '001', creationDate: '2025-03-26T12:00:00', creatorUser: 'USUARIO.HELISA', position: 'EMPLEADO', lastUpdate: '2025-03-27T13:00:00', status: 'APROBADO', approvers: ['AS'], priority: true },
    { type: 'VIATICOS', id: '002', creationDate: '2025-03-26T12:00:00', creatorUser: 'USUARIO.HELISA', position: 'EMPLEADO', lastUpdate: '2025-03-27T13:00:00', status: 'APROBADO', approvers: ['LC', 'JS'], priority: true },
    { type: 'REQUISICIONES', id: '003', creationDate: '2025-03-26T12:00:00', creatorUser: 'USUARIO.HELISA', position: 'EMPLEADO', lastUpdate: '2025-03-27T13:00:00', status: 'APROBADO', approvers: ['LC', 'JS'], priority: false },
    { type: 'VIATICOS', id: '004', creationDate: '2025-03-27T08:30:00', creatorUser: 'ANA.ROJAS', position: 'ANALISTA', lastUpdate: '2025-03-28T10:00:00', status: 'PENDIENTE', approvers: ['LC'], priority: false },
    { type: 'REQUISICIONES', id: '005', creationDate: '2025-03-26T09:45:00', creatorUser: 'CARLOS.DIAZ', position: 'JEFE DE ÁREA', lastUpdate: '2025-03-27T14:30:00', status: 'APROBADO', approvers: ['LC', 'JS'], priority: true },
    { type: 'VIATICOS', id: '006', creationDate: '2025-03-27T11:20:00', creatorUser: 'MARIA.GOMEZ', position: 'EMPLEADO', lastUpdate: '2025-03-28T08:00:00', status: 'RECHAZADO', approvers: ['AS'], priority: false },
    { type: 'REQUISICIONES', id: '007', creationDate: '2025-03-28T13:00:00', creatorUser: 'JUAN.PEREZ', position: 'COORDINADOR', lastUpdate: '2025-03-29T16:00:00', status: 'PENDIENTE', approvers: ['LC', 'AS'], priority: true },
    { type: 'VIATICOS', id: '008', creationDate: '2025-03-29T15:30:00', creatorUser: 'LUISA.MORA', position: 'SUPERVISOR', lastUpdate: '2025-03-30T09:00:00', status: 'APROBADO', approvers: ['JS'], priority: false },
    { type: 'REQUISICIONES', id: '009', creationDate: '2025-03-30T07:50:00', creatorUser: 'FERNANDO.TORO', position: 'JEFE DE ÁREA', lastUpdate: '2025-03-30T17:00:00', status: 'APROBADO', approvers: ['JS', 'LC'], priority: true },
    { type: 'VIATICOS', id: '010', creationDate: '2025-04-01T10:15:00', creatorUser: 'CLAUDIA.VERA', position: 'EMPLEADO', lastUpdate: '2025-04-01T14:00:00', status: 'RECHAZADO', approvers: ['LC'], priority: false },
    { type: 'REQUISICIONES', id: '011', creationDate: '2025-04-02T08:10:00', creatorUser: 'MARIO.SOSA', position: 'ANALISTA', lastUpdate: '2025-04-02T16:30:00', status: 'PENDIENTE', approvers: ['JS'], priority: true },
    { type: 'VIATICOS', id: '012', creationDate: '2025-04-03T09:20:00', creatorUser: 'PATRICIA.OLIVER', position: 'SUPERVISOR', lastUpdate: '2025-04-04T10:00:00', status: 'APROBADO', approvers: ['LC'], priority: false },
    { type: 'REQUISICIONES', id: '013', creationDate: '2025-04-04T14:30:00', creatorUser: 'GABRIELA.MENDEZ', position: 'JEFE DE ÁREA', lastUpdate: '2025-04-05T11:00:00', status: 'RECHAZADO', approvers: ['AS'], priority: false },
    { type: 'VIATICOS', id: '014', creationDate: '2025-03-26T12:00:00', creatorUser: 'USUARIO.HELISA', position: 'EMPLEADO', lastUpdate: '2025-03-27T13:00:00', status: 'APROBADO', approvers: ['AS'], priority: true },
    { type: 'VIATICOS', id: '015', creationDate: '2025-03-26T12:00:00', creatorUser: 'USUARIO.HELISA', position: 'EMPLEADO', lastUpdate: '2025-03-27T13:00:00', status: 'APROBADO', approvers: ['LC', 'JS'], priority: true },
    { type: 'REQUISICIONES', id: '016', creationDate: '2025-03-26T12:00:00', creatorUser: 'USUARIO.HELISA', position: 'EMPLEADO', lastUpdate: '2025-03-27T13:00:00', status: 'APROBADO', approvers: ['LC', 'JS'], priority: false },
    { type: 'VIATICOS', id: '017', creationDate: '2025-03-27T08:30:00', creatorUser: 'ANA.ROJAS', position: 'ANALISTA', lastUpdate: '2025-03-28T10:00:00', status: 'PENDIENTE', approvers: ['LC'], priority: false },
    { type: 'REQUISICIONES', id: '018', creationDate: '2025-03-26T09:45:00', creatorUser: 'CARLOS.DIAZ', position: 'JEFE DE ÁREA', lastUpdate: '2025-03-27T14:30:00', status: 'APROBADO', approvers: ['LC', 'JS'], priority: true },
    { type: 'VIATICOS', id: '019', creationDate: '2025-03-27T11:20:00', creatorUser: 'MARIA.GOMEZ', position: 'EMPLEADO', lastUpdate: '2025-03-28T08:00:00', status: 'RECHAZADO', approvers: ['AS'], priority: false },
    { type: 'REQUISICIONES', id: '020', creationDate: '2025-03-28T13:00:00', creatorUser: 'JUAN.PEREZ', position: 'COORDINADOR', lastUpdate: '2025-03-29T16:00:00', status: 'PENDIENTE', approvers: ['LC', 'AS'], priority: true },
    { type: 'VIATICOS', id: '021', creationDate: '2025-03-29T15:30:00', creatorUser: 'LUISA.MORA', position: 'SUPERVISOR', lastUpdate: '2025-03-30T09:00:00', status: 'APROBADO', approvers: ['JS'], priority: false },
    { type: 'REQUISICIONES', id: '022', creationDate: '2025-03-30T07:50:00', creatorUser: 'FERNANDO.TORO', position: 'JEFE DE ÁREA', lastUpdate: '2025-03-30T17:00:00', status: 'APROBADO', approvers: ['JS', 'LC'], priority: true },
    { type: 'VIATICOS', id: '023', creationDate: '2025-04-01T10:15:00', creatorUser: 'CLAUDIA.VERA', position: 'EMPLEADO', lastUpdate: '2025-04-01T14:00:00', status: 'RECHAZADO', approvers: ['LC'], priority: false },
    { type: 'REQUISICIONES', id: '024', creationDate: '2025-04-02T08:10:00', creatorUser: 'MARIO.SOSA', position: 'ANALISTA', lastUpdate: '2025-04-02T16:30:00', status: 'PENDIENTE', approvers: ['JS'], priority: true },
    { type: 'VIATICOS', id: '025', creationDate: '2025-04-03T09:20:00', creatorUser: 'PATRICIA.OLIVER', position: 'SUPERVISOR', lastUpdate: '2025-04-04T10:00:00', status: 'APROBADO', approvers: ['LC'], priority: false },
    { type: 'REQUISICIONES', id: '026', creationDate: '2025-04-04T14:30:00', creatorUser: 'GABRIELA.MENDEZ', position: 'JEFE DE ÁREA', lastUpdate: '2025-04-05T11:00:00', status: 'RECHAZADO', approvers: ['AS'], priority: false }
  ];

  displayedRequests: any[] = [];
  private filteredRequests: any[] = [];
  totalFiltered: number = 0;

  searchTerm: string = '';
  showOnlyApproved: boolean = false;
  currentPage: number = 1;
  itemsPerPage: number = 10;
  currentOrder: string = 'creationDate';
  ascendingOrder: boolean = false;

  ngOnInit(): void {
    this.applyViewLogic();
  }

  applyViewLogic(): void {
    let result = [...this.approvalsList];
    if (this.showOnlyApproved) {
      result = result.filter(req => req.status === 'APROBADO');
    }
    if (this.searchTerm) {
      const search = this.searchTerm.toLowerCase();
      result = result.filter(req =>
        req.type.toLowerCase().includes(search) ||
        req.creatorUser.toLowerCase().includes(search) ||
        req.id.toLowerCase().includes(search)
      );
    }
    this.filteredRequests = result;
    this.totalFiltered = this.filteredRequests.length;

    if (this.currentOrder) {
      this.filteredRequests.sort((a, b) => {
        const valueA = (a as any)[this.currentOrder];
        const valueB = (b as any)[this.currentOrder];
        if (valueA < valueB) return this.ascendingOrder ? -1 : 1;
        if (valueA > valueB) return this.ascendingOrder ? 1 : -1;
        return 0;
      });
    }

    const start = (this.currentPage - 1) * this.itemsPerPage;
    this.displayedRequests = this.filteredRequests.slice(start, start + this.itemsPerPage);
  }

  onToggleApproved(value: boolean): void {
    this.showOnlyApproved = value;
    this.currentPage = 1;
    this.applyViewLogic();
  }

  onQuantityChange(quantity: number): void {
    this.itemsPerPage = Number(quantity);
    this.currentPage = 1;
    this.applyViewLogic();
  }

  onSearchChange(term: string): void {
    this.searchTerm = term;
    this.currentPage = 1;
    this.applyViewLogic();
  }

  onChangePage(newPage: number): void {
    this.currentPage = newPage;
    this.applyViewLogic();
  }

  sortBy(field: string): void {
    if (this.currentOrder === field) {
      this.ascendingOrder = !this.ascendingOrder;
    } else {
      this.currentOrder = field;
      this.ascendingOrder = true;
    }
    this.applyViewLogic();
  }

  onManage(id: string): void {
    console.log('Managing request with ID from parent:', id);
  }
}