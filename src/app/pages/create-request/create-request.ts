import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { Controls } from '../approvals/controls/controls';
import { RequestsTable } from '../approvals/requests-table/requests-table';
import { FooterControls } from '../approvals/footer-controls/footer-controls';
import { CreateForm, SolicitudData } from './create-form/create-form';
import { RequestSuccessModal, SuccessModalData } from './request-success-modal/request-success-modal';
import { Usuario } from '../../interfaces/common.interfaces';
import { UserService } from '../../services/user.service';

interface Approval {
  type: string;
  id: string;
  creationDate: string;
  creatorUser: string;
  position: string;
  lastUpdate: string;
  status: 'APROBADO' | 'RECHAZADO' | 'PENDIENTE' | 'CANCELADA';
  approvers: string[];
  priority: boolean;
  fullData?: SuccessModalData;
}

@Component({
  selector: 'app-create-request',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    Controls,
    RequestsTable,
    FooterControls,
    CreateForm,
    RequestSuccessModal
  ],
  templateUrl: './create-request.html',
  styleUrls: ['./create-request.css']
})
export class CreateRequest implements OnInit {
  isCreateModalVisible = false;
  isDetailModalVisible = false;
  successModalData: SuccessModalData | null = null;

  loggedInUser: Usuario = {
    noUsuario: 1,
    nombres: 'Luis Gabriel',
    apellidos: 'Perez Cabrales',
    usuario: 'USUARIO.HELISA',
    identificacion: '123',
    estado: 'Activo',
    activo: true
  };

  allUsers: Usuario[] = [];

  approvalsList: Approval[] = [];

  displayedRequests: Approval[] = [];
  private filteredRequests: Approval[] = [];
  totalFiltered: number = 0;
  searchTerm: string = '';
  showOnlyApproved: boolean = false;
  currentPage: number = 1;
  itemsPerPage: number = 10;
  currentOrder: string = 'creationDate';
  ascendingOrder: boolean = false;

  constructor(private userService: UserService) {}

  ngOnInit(): void {
    this.loadUsers();
    this.applyViewLogic();
  }

  loadUsers(): void {
    this.userService.obtenerUsuarios().subscribe(users => {
      this.allUsers = users;
    });
  }

  openCreateModal(): void {
    this.isCreateModalVisible = true;
  }

  closeCreateModal(): void {
    this.isCreateModalVisible = false;
  }

  handleSaveRequest(solicitudData: SolicitudData): void {
    const newId = `00${this.approvalsList.length + 1}`;
    const now = new Date();

    const newSuccessData: SuccessModalData = {
      ...solicitudData,
      id: newId,
      creador: this.loggedInUser,
      fechaCreacion: now,
      estado: 'Pendiente'
    };

    const newApproval: Approval = {
      id: newId,
      type: solicitudData.tipologia,
      creationDate: now.toISOString(),
      creatorUser: this.loggedInUser.usuario,
      position: 'EMPLEADO',
      lastUpdate: now.toISOString(),
      status: 'PENDIENTE',
      approvers: solicitudData.destinatarios.map(d => d.usuarioId.substring(0, 2).toUpperCase()),
      priority: solicitudData.prioridad === 'IMPORTANTE',
      fullData: newSuccessData
    };

    this.approvalsList.unshift(newApproval);
    this.applyViewLogic();

    this.successModalData = newSuccessData;
    this.isCreateModalVisible = false;
    this.isDetailModalVisible = true;
  }

  closeDetailModal(): void {
    this.isDetailModalVisible = false;
    this.successModalData = null;
  }

  handleCancelRequest(event: { solicitudId: string | number }): void {
    const request = this.approvalsList.find(req => req.id === event.solicitudId);
    if (request) {
      request.status = 'CANCELADA';
      if (request.fullData) {
        request.fullData.estado = 'Cancelada';
      }
      this.applyViewLogic();
    }
    this.closeDetailModal();
  }

  handleDeleteRequest(solicitudId: string | number): void {
      const index = this.approvalsList.findIndex(req => req.id === solicitudId);
      if (index > -1) {
          this.approvalsList.splice(index, 1);
          this.applyViewLogic();
      }
  }

  onManage(id: string): void {
    const request = this.approvalsList.find(req => req.id === id);
    if (request && request.fullData) {
      this.successModalData = request.fullData;
      this.isDetailModalVisible = true;
    }
  }

  applyViewLogic(): void {
    let result: Approval[] = [...this.approvalsList];
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

    this.filteredRequests.sort((a, b) => {
      const valueA = (a as any)[this.currentOrder];
      const valueB = (b as any)[this.currentOrder];
      if (valueA < valueB) return this.ascendingOrder ? -1 : 1;
      if (valueA > valueB) return this.ascendingOrder ? 1 : -1;
      return 0;
    });

    const start = (this.currentPage - 1) * this.itemsPerPage;
    this.displayedRequests = this.filteredRequests.slice(start, start + this.itemsPerPage);
  }

  onToggleApproved(value: boolean): void { this.showOnlyApproved = value; this.currentPage = 1; this.applyViewLogic(); }
  onQuantityChange(quantity: number): void { this.itemsPerPage = Number(quantity); this.currentPage = 1; this.applyViewLogic(); }
  onSearchChange(term: string): void { this.searchTerm = term; this.currentPage = 1; this.applyViewLogic(); }
  onChangePage(newPage: number): void { this.currentPage = newPage; this.applyViewLogic(); }
  sortBy(field: string): void { if (this.currentOrder === field) { this.ascendingOrder = !this.ascendingOrder; } else { this.currentOrder = field; this.ascendingOrder = true; } this.applyViewLogic(); }
}