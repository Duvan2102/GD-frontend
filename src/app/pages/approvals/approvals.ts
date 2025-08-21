import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { Controls } from './controls/controls';
import { RequestsTable } from './requests-table/requests-table';
import { FooterControls } from './footer-controls/footer-controls';
import { RequestSuccessModal, SuccessModalData } from '../create-request/request-success-modal/request-success-modal';
import { ApprovalDocumentView, ApprovalDocumentViewData } from './approval-document-view/approval-document-view';
import { Usuario } from '../../interfaces/common.interfaces';
import { UserService } from '../../services/user.service';
import { ApprovalService } from '../../services/approval.service';
import { Subscription } from 'rxjs';

export interface Approval {
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
  selector: 'app-approvals',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    Controls,
    RequestsTable,
    FooterControls,
    RequestSuccessModal,
    ApprovalDocumentView
  ],
  templateUrl: './approvals.html',
  styleUrls: ['./approvals.css']
})
export class Approvals implements OnInit, OnDestroy {
  // ... (propiedades existentes sin cambios)
  approvalsList: Approval[] = [];
  private approvalsSubscription: Subscription | undefined;
  isDetailModalVisible = false;
  successModalData: SuccessModalData | null = null;
  allUsers: Usuario[] = [];
  displayedRequests: any[] = [];
  private filteredRequests: any[] = [];
  totalFiltered: number = 0;
  searchTerm: string = '';
  showOnlyApproved: boolean = false;
  currentPage: number = 1;
  itemsPerPage: number = 10;
  currentOrder: string = 'creationDate';
  ascendingOrder: boolean = false;
  isApprovalDocumentViewVisible = false;
  documentToApproveData: ApprovalDocumentViewData | null = null;

  constructor(
    private userService: UserService,
    private approvalService: ApprovalService
  ) {}

  ngOnInit(): void {
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

  loadUsers(): void {
    this.userService.obtenerUsuarios().subscribe(users => {
      this.allUsers = users;
    });
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

  onToggleApproved(value: boolean): void { this.showOnlyApproved = value; this.currentPage = 1; this.applyViewLogic(); }
  onQuantityChange(quantity: number): void { this.itemsPerPage = Number(quantity); this.currentPage = 1; this.applyViewLogic(); }
  onSearchChange(term: string): void { this.searchTerm = term; this.currentPage = 1; this.applyViewLogic(); }
  onChangePage(newPage: number): void { this.currentPage = newPage; this.applyViewLogic(); }
  sortBy(field: string): void { if (this.currentOrder === field) { this.ascendingOrder = !this.ascendingOrder; } else { this.currentOrder = field; this.ascendingOrder = true; } this.applyViewLogic(); }

  onManage(id: string): void {
    const request = this.approvalsList.find(req => req.id === id);
    if (request && request.fullData) {
      if (request.fullData.estado === 'Enviada') {
        request.status = 'PENDIENTE';
        request.fullData.estado = 'Pendiente';
        this.approvalService.updateApproval(request);
      }
      this.successModalData = request.fullData;
      this.isDetailModalVisible = true;
    }
  }

  closeDetailModal() {
    this.isDetailModalVisible = false;
    this.successModalData = null;
  }
  
  handleOpenDocumentToApprove(data: SuccessModalData) {
    if (data && data.documentoAprobacion) {
      this.documentToApproveData = {
        id: data.id!,
        file: data.documentoAprobacion,
        title: data.nombreSolicitud,
      };
      this.isDetailModalVisible = false; 
      this.isApprovalDocumentViewVisible = true; 
    }
  }

  handleApproveRequest(id: string | number) {
    this.updateRequestStatus(id, 'APROBADO', 'Aprobada');
    this.isApprovalDocumentViewVisible = false;
  }
  
  handleRejectRequest(id: string | number) {
    this.updateRequestStatus(id, 'RECHAZADO', 'Rechazada');
    this.isApprovalDocumentViewVisible = false;
  }

  private updateRequestStatus(id: string | number, approvalStatus: 'APROBADO' | 'RECHAZADO', fullDataStatus: 'Aprobada' | 'Rechazada') {
    const request = this.approvalsList.find(req => req.id === id);
    if (request) {
        request.status = approvalStatus;
        if (request.fullData) {
            request.fullData.estado = fullDataStatus;
        }
        this.approvalService.updateApproval(request);
        this.applyViewLogic();
    }
  }
  
  closeApprovalDocumentView() {
    this.isApprovalDocumentViewVisible = false;
    this.documentToApproveData = null;
  }
}