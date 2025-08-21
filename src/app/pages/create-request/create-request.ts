import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { Controls } from '../approvals/controls/controls';
import { RequestsTable } from '../approvals/requests-table/requests-table';
import { FooterControls } from '../approvals/footer-controls/footer-controls';
import { CreateForm, SolicitudData } from './create-form/create-form';
import { RequestSuccessModal, SuccessModalData, EstadoSolicitud } from './request-success-modal/request-success-modal';
import { Usuario } from '../../interfaces/common.interfaces';
import { UserService } from '../../services/user.service';
import { TypologyService, Typology } from '../../services/typology.service';
import { ApprovalService } from '../../services/approval.service';
import { Subscription } from 'rxjs';
import { Approval } from '../approvals/approvals';

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
export class CreateRequest implements OnInit, OnDestroy {
  isCreateModalVisible = false;
  isDetailModalVisible = false;
  successModalData: SuccessModalData | null = null;
  loggedInUser: Usuario = {
    noUsuario: 1,
    nombres: 'Luis Gabriel',
    apellidos: 'Perez Cabrales',
    usuario: 'luis.perez',
    identificacion: '123',
    estado: 'Activo',
    activo: true
  };
  allUsers: Usuario[] = [];
  tipologias: Typology[] = [];
  approvalsList: Approval[] = [];
  private approvalsSubscription: Subscription | undefined;
  displayedRequests: Approval[] = [];
  private filteredRequests: Approval[] = [];
  totalFiltered: number = 0;
  searchTerm: string = '';
  showOnlyApproved: boolean = false;
  currentPage: number = 1;
  itemsPerPage: number = 10;
  currentOrder: string = 'creationDate';
  ascendingOrder: boolean = false;

  constructor(
    private userService: UserService,
    private typologyService: TypologyService,
    private approvalService: ApprovalService
  ) {}

  ngOnInit(): void {
    this.loadTypologies();
    this.loadUsers();
    this.approvalsSubscription = this.approvalService.approvals$.subscribe(approvals => {
      this.approvalsList = approvals;
      this.applyViewLogic();
    });
  }

  ngOnDestroy(): void {
    if (this.approvalsSubscription) {
      this.approvalsSubscription.unsubscribe();
    }
  }

  loadTypologies(): void {
    this.typologyService.getAll().subscribe(typologies => {
      this.tipologias = typologies;
      this.applyViewLogic();
    });
  }

  loadUsers(): void {
    this.userService.obtenerUsuarios().subscribe(users => {
      this.allUsers = users;
      if (this.tipologias.length > 0) {
        this.applyViewLogic();
      }
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
    const estadoInicial: EstadoSolicitud = 'Enviada';

    const newSuccessData: SuccessModalData = {
      ...solicitudData,
      id: newId,
      creador: this.loggedInUser,
      fechaCreacion: now,
      estado: estadoInicial,
      approverStates: solicitudData.destinatarios.map(d => ({ usuarioId: d.usuarioId, estado: 'Pendiente' }))
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

    this.approvalService.addApproval(newApproval);
    this.successModalData = newSuccessData;
    this.isCreateModalVisible = false;
    this.isDetailModalVisible = true;
  }

  closeDetailModal(): void {
    this.isDetailModalVisible = false;
    this.successModalData = null;
  }

  handleCancelRequest(event: { solicitudId: string | number }): void {
    const request = this.approvalsList.find(req => req.id.toString() === event.solicitudId.toString());
    if (request) {
      request.status = 'CANCELADA';
      if (request.fullData) {
        request.fullData.estado = 'Cancelada';
      }
      this.approvalService.updateApproval(request);
    }
    this.closeDetailModal();
  }

  handleDeleteRequest(solicitudId: string | number): void {
    this.approvalService.deleteApproval(solicitudId);
  }

  onManage(id: string): void {
    const request = this.approvalsList.find(req => req.id === id);
    if (request && request.fullData) {
      this.successModalData = request.fullData;
      this.isDetailModalVisible = true;
    }
  }

  applyViewLogic(): void {
    if (this.tipologias.length === 0 || this.allUsers.length === 0) {
      this.displayedRequests = [];
      return;
    }

    const getTypologyDescription = (typeId: string): string => {
      const typology = this.tipologias.find(t => t.idTipologia.toString() === typeId.toString());
      return typology ? typology.descripcion : typeId;
    };

    const getUserFullName = (userId: string): string => {
      const user = this.allUsers.find(u => u.usuario === userId);
      return user ? `${user.nombres} ${user.apellidos}` : userId;
    };

    let result: Approval[] = [...this.approvalsList];
    if (this.showOnlyApproved) {
      result = result.filter(req => req.status === 'APROBADO');
    }
    if (this.searchTerm) {
      const search = this.searchTerm.toLowerCase();
      result = result.filter(req =>
        getTypologyDescription(req.type).toLowerCase().includes(search) ||
        getUserFullName(req.creatorUser).toLowerCase().includes(search) ||
        req.id.toLowerCase().includes(search)
      );
    }
    this.filteredRequests = result;
    this.totalFiltered = this.filteredRequests.length;

    this.filteredRequests.sort((a, b) => {
      let valueA, valueB;
      switch (this.currentOrder) {
        case 'type':
          valueA = getTypologyDescription(a.type);
          valueB = getTypologyDescription(b.type);
          break;
        case 'creatorUser':
          valueA = getUserFullName(a.creatorUser);
          valueB = getUserFullName(b.creatorUser);
          break;
        default:
          valueA = (a as any)[this.currentOrder];
          valueB = (b as any)[this.currentOrder];
      }
      if (valueA < valueB) return this.ascendingOrder ? -1 : 1;
      if (valueA > valueB) return this.ascendingOrder ? 1 : -1;
      return 0;
    });

    const start = (this.currentPage - 1) * this.itemsPerPage;
    const page = this.filteredRequests.slice(start, start + this.itemsPerPage);

    this.displayedRequests = page.map(req => ({
      ...req,
      type: getTypologyDescription(req.type),
      creatorUser: getUserFullName(req.creatorUser)
    }));
  }

  onToggleApproved(value: boolean): void { this.showOnlyApproved = value; this.currentPage = 1; this.applyViewLogic(); }
  onQuantityChange(quantity: number): void { this.itemsPerPage = Number(quantity); this.currentPage = 1; this.applyViewLogic(); }
  onSearchChange(term: string): void { this.searchTerm = term; this.currentPage = 1; this.applyViewLogic(); }
  onChangePage(newPage: number): void { this.currentPage = newPage; this.applyViewLogic(); }
  sortBy(field: string): void { if (this.currentOrder === field) { this.ascendingOrder = !this.ascendingOrder; } else { this.currentOrder = field; this.ascendingOrder = true; } this.applyViewLogic(); }
}