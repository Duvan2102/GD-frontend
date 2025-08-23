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
import { delay } from 'rxjs/operators';
import { AuthService } from '../../services/auth.service';
import { Typology, TypologyService } from '../../services/typology.service';

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
  approvalsList: Approval[] = [];
  private approvalsSubscription: Subscription | undefined;
  isDetailModalVisible = false;
  successModalData: SuccessModalData | null = null;
  allUsers: Usuario[] = [];
  tipologias: Typology[] = [];
  displayedRequests: any[] = [];
  private filteredRequests: any[] = [];
  totalFiltered: number = 0;
  searchTerm: string = '';
  showOnlyManaged: boolean = false;
  currentPage: number = 1;
  itemsPerPage: number = 10;
  currentOrder: string = 'creationDate';
  ascendingOrder: boolean = false;
  isApprovalDocumentViewVisible = false;
  documentToApproveData: ApprovalDocumentViewData | null = null;
  isLoadingDetails = false;
  currentUser: Usuario | null = null;

  constructor(
    private userService: UserService,
    private approvalService: ApprovalService,
    private authService: AuthService,
    private typologyService: TypologyService
  ) {}

  ngOnInit(): void {
    this.authService.getCurrentUser().subscribe(user => {
        this.currentUser = user;
        this.loadUsers();
        this.loadTypologies();
        this.subscribeToApprovals();
    });
  }

  ngOnDestroy(): void {
    this.approvalsSubscription?.unsubscribe();
  }

  loadUsers(): void {
    this.userService.obtenerUsuarios().subscribe(users => {
      this.allUsers = users;
    });
  }

  loadTypologies(): void {
    this.typologyService.getAll().subscribe(data => {
      this.tipologias = data;
    });
  }

  subscribeToApprovals(): void {
    if (!this.currentUser) return;
    this.approvalsSubscription = this.approvalService.getApprovalsByApprover(this.currentUser.usuario)
      .subscribe(approvals => {
          this.approvalsList = approvals;
          this.applyViewLogic();
    });
  }

  onManage(id: string): void {
    this.isLoadingDetails = true;
    this.approvalService.getApprovalDetails(id).pipe(delay(500))
      .subscribe(requestDetails => {
      if (requestDetails) {
        if (requestDetails.fullData?.estado === 'Enviada') {
            requestDetails.status = 'PENDIENTE';
            if(requestDetails.fullData){
              requestDetails.fullData.estado = 'Pendiente';
            }
            this.approvalService.updateApproval(requestDetails);
        }
        this.successModalData = requestDetails.fullData || null;
        this.isDetailModalVisible = true;
      }
      this.isLoadingDetails = false;
    });
  }
  
  applyViewLogic(): void {
    const getTypologyDescription = (typeId: string): string => {
      const typology = this.tipologias.find(t => t.idTipologia.toString() === typeId);
      return typology ? typology.descripcion : typeId;
    };

    let result = [...this.approvalsList];
    if (this.showOnlyManaged) {
        result = result.filter(req => ['APROBADO', 'RECHAZADO', 'CANCELADA'].includes(req.status));
    } else {
        result = result.filter(req => req.status === 'PENDIENTE');
    }

    if (this.searchTerm) {
      const search = this.searchTerm.toLowerCase();
      result = result.filter(req =>
        getTypologyDescription(req.type).toLowerCase().includes(search) ||
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
    this.displayedRequests = this.filteredRequests.slice(start, start + this.itemsPerPage).map(req => ({
      ...req,
      type: getTypologyDescription(req.type)
    }));
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
    this.approvalService.getApprovalDetails(id).subscribe(request => {
      if (request) {
        request.status = approvalStatus;
        if (request.fullData) {
            request.fullData.estado = fullDataStatus;
        }
        this.approvalService.updateApproval(request);
      }
    });
  }
  
  closeApprovalDocumentView() {
    this.isApprovalDocumentViewVisible = false;
    this.documentToApproveData = null;
  }

  onToggleManaged(value: boolean): void { this.showOnlyManaged = value; this.currentPage = 1; this.applyViewLogic(); }
  onQuantityChange(quantity: number): void { this.itemsPerPage = Number(quantity); this.currentPage = 1; this.applyViewLogic(); }
  onSearchChange(term: string): void { this.searchTerm = term; this.currentPage = 1; this.applyViewLogic(); }
  onChangePage(newPage: number): void { this.currentPage = newPage; this.applyViewLogic(); }
  sortBy(field: string): void { if (this.currentOrder === field) { this.ascendingOrder = !this.ascendingOrder; } else { this.currentOrder = field; this.ascendingOrder = true; } this.applyViewLogic(); }
}