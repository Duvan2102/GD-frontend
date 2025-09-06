import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { Controls } from './controls/controls';
import { RequestsTable } from './requests-table/requests-table';
import { FooterControls } from './footer-controls/footer-controls';
import { RequestSuccessModal, SuccessModalData } from '../create-request/request-success-modal/request-success-modal';
import { ApprovalDocumentView, ApprovalDocumentViewData } from './approval-document-view/approval-document-view';
import { DocumentView, DocumentViewData } from '../create-request/document-view/document-view';
import { Usuario } from '../../interfaces/common.interfaces';
import { UserService } from '../../services/user.service';
import { ApprovalService } from '../../services/approval.service';
import { Subscription, combineLatest } from 'rxjs';
import { delay } from 'rxjs/operators';
import { AuthService } from '../../services/auth.service';
import { Typology, TypologyService } from '../../services/typology.service';
import { applyViewLogic } from '../../utils/view.utils';

export interface Approval {
  type: string;
  id: string;
  creationDate: string;
  creatorUser: string;
  creatorFullName: string;
  position: string;
  lastUpdate: string;
  status: 'APROBADO' | 'RECHAZADO' | 'PENDIENTE' | 'CANCELADA';
  approvers: { initials: string; fullName: string }[];
  priority: boolean;
  fullData?: any;
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
    ApprovalDocumentView,
    DocumentView
  ],
  templateUrl: './approvals.html',
  styleUrls: ['./approvals.css']
})
export class Approvals implements OnInit, OnDestroy {
  approvalsList: Approval[] = [];
  private pendingApprovals: Approval[] = [];
  private managedApprovals: Approval[] = [];
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
  
  // Propiedades para document-view
  isDocumentViewVisible = false;
  documentViewData: DocumentViewData | null = null;

  constructor(
    private userService: UserService,
    private approvalService: ApprovalService,
    private authService: AuthService,
    private typologyService: TypologyService
  ) {}

  ngOnInit(): void {
    this.authService.getCurrentUser().subscribe(user => {
        this.currentUser = user;
        this.loadUsersAndApprovals();
    });
  }

  ngOnDestroy(): void {
    this.approvalsSubscription?.unsubscribe();
  }

  loadUsersAndApprovals(): void {
    combineLatest([
      this.userService.obtenerUsuarios(),
      this.typologyService.getAll()
    ]).subscribe(([users, typologies]) => {
      this.allUsers = users;
      this.tipologias = typologies;
      this.subscribeToApprovals();
    });
  }

  subscribeToApprovals(): void {
    if (!this.currentUser) return;
    const uid = this.currentUser.noUsuario;
    this.approvalService.getApprovalsForApprover(uid, this.allUsers).subscribe(list => {
      this.pendingApprovals = list || [];
      this.refreshApprovalsSource();
    });
    this.approvalService.getHistorico(uid, this.allUsers).subscribe(list => {
      this.managedApprovals = (list || []).filter(a => ['APROBADO','RECHAZADO','CANCELADA'].includes(a.status));
      this.refreshApprovalsSource();
    });
  }

  private refreshApprovalsSource(): void {
    this.approvalsList = this.showOnlyManaged ? this.managedApprovals : this.pendingApprovals;
    this.applyViewLogic();
  }

  onManage(id: string): void {
    this.isLoadingDetails = true;
    const uid = this.currentUser?.noUsuario;
    this.approvalService.getApprovalDetails(id, this.allUsers, uid).pipe(delay(500))
      .subscribe(requestDetails => {
      if (requestDetails) {
        if (requestDetails.fullData?.estado === 'Enviada') {
            requestDetails.status = 'PENDIENTE';
            if(requestDetails.fullData){
              requestDetails.fullData.estado = 'Pendiente';
            }
            this.approvalService.updateApproval(requestDetails);
        }
        // Usar directamente los datos ya procesados en lugar de mapear nuevamente
        this.successModalData = requestDetails.fullData;
        this.isDetailModalVisible = true;
      }
      this.isLoadingDetails = false;
    });
  }

  applyViewLogic(): void {
    const { displayedRequests, totalFiltered } = applyViewLogic(
      this.approvalsList,
      this.showOnlyManaged,
      this.searchTerm,
      this.currentOrder,
      this.ascendingOrder,
      this.itemsPerPage,
      this.currentPage,
      this.tipologias,
      this.allUsers
    );
    this.displayedRequests = displayedRequests;
    this.totalFiltered = totalFiltered;
  }

  closeDetailModal() {
    this.isDetailModalVisible = false;
    this.successModalData = null;
  }

  handleViewApprovedDocument(data: SuccessModalData): void {
    
    const documentFile = data?.documentoAprobacion || 
                        (data?.documentosAnexos as any)?.[0] || 
                        (data?.anexos as any)?.[0] || 
                        (data?.adjuntos as any)?.[0] ||
                        (data as any)?.documento || 
                        (data as any)?.archivo || 
                        (data as any)?.file;
    
    const documentUrl = data?.documentoUrl || 
                       (data as any)?.url || 
                       (data as any)?.documentUrl;
    
    
    if (!documentFile && !documentUrl && data?.pdfOriginalName && this.currentUser?.noUsuario) {
      this.isLoadingDetails = true;
      
      this.approvalService.getDocumentPdf(data.id!, this.currentUser.noUsuario).subscribe({
        next: (pdfBlob: Blob) => {
          const pdfUrl = URL.createObjectURL(pdfBlob);
          this.documentViewData = {
            id: data.id!,
            file: undefined,
            url: pdfUrl,
            title: data.nombreSolicitud,
            fileName: data.pdfOriginalName,
            metadata: {
              pdfOriginalName: data.pdfOriginalName,
              pdfSizeBytes: data.pdfSizeBytes,
              isPdfMetadata: false,
              isPdfFromService: true
            }
          };
          this.isDetailModalVisible = false;
          this.isDocumentViewVisible = true;
          this.isLoadingDetails = false;
        },
        error: (error) => {
          this.isLoadingDetails = false;
          this.documentViewData = {
            id: data.id!,
            file: undefined,
            url: undefined,
            title: data.nombreSolicitud,
            fileName: data.pdfOriginalName,
            metadata: {
              pdfOriginalName: data.pdfOriginalName,
              pdfSizeBytes: data.pdfSizeBytes,
              isPdfMetadata: true,
              error: 'No se pudo cargar el PDF'
            }
          };
          this.isDetailModalVisible = false;
          this.isDocumentViewVisible = true;
        }
      });
    } else if (data && (documentFile || documentUrl)) {
      this.documentViewData = {
        id: data.id!,
        file: documentFile,
        url: documentUrl,
        title: data.nombreSolicitud,
        fileName: data.documentoFileName || documentFile?.name || 'Documento Aprobado'
      };
      this.isDetailModalVisible = false;
      this.isDocumentViewVisible = true;
    }
  }

  closeDocumentView(): void {
    this.isDocumentViewVisible = false;
    this.documentViewData = null;
  }

  handleOpenDocumentToApprove(data: SuccessModalData) {
    if (data && data.documentoAprobacion) {
      this.documentToApproveData = {
        id: data.id!,
        file: data.documentoAprobacion,
        title: data.nombreSolicitud,
        fileName: data.documentoFileName || data.documentoAprobacion.name
      };
      this.isDetailModalVisible = false;
      this.isApprovalDocumentViewVisible = true;
    } else if (data && data.documentoUrl) {
      this.documentToApproveData = {
        id: data.id!,
        url: data.documentoUrl,
        title: data.nombreSolicitud,
        fileName: data.documentoFileName || 'Documento de la Solicitud'
      };
      this.isDetailModalVisible = false;
      this.isApprovalDocumentViewVisible = true;
    } else if (data) {
      // Fallback para datos legacy
      const anyData: any = data as any;
      const url = anyData.documentoUrl || anyData.pdfUrl || anyData.urlDocumento || anyData.url;
      if (url) {
        this.documentToApproveData = {
          id: data.id!,
          url: url,
          title: (anyData.titulo || anyData.nombreSolicitud || 'Documento de la Solicitud'),
          fileName: anyData.documentoFileName || anyData.pdfFileName || anyData.nombreArchivo || anyData.fileName
        };
        this.isDetailModalVisible = false;
        this.isApprovalDocumentViewVisible = true;
      } else {
        // Si no hay URL directa, intentar obtener el documento del servidor
        const userId = this.currentUser?.noUsuario;
        if (userId && data.id) {
          this.approvalService.getDocumentPdf(data.id, userId).subscribe({
            next: (blob) => {
              const url = URL.createObjectURL(blob);
              this.documentToApproveData = {
                id: data.id!,
                url: url,
                title: data.nombreSolicitud || 'Documento de la Solicitud',
                fileName: data.documentoFileName || 'documento.pdf'
              };
              this.isDetailModalVisible = false;
              this.isApprovalDocumentViewVisible = true;
            },
            error: (error) => {
              alert('Error al cargar el documento. Por favor, inténtalo de nuevo.');
            }
          });
        } else {
          alert('No se pudo cargar el documento. Verifique que la solicitud tenga un documento asociado.');
        }
      }
    }
  }

  handleApproveRequest(ev: { id: string | number, comentario?: string }) {
    const uid = this.currentUser?.noUsuario;
    if (!uid) return;
    this.approvalService.aprobarSolicitud(ev.id, uid, ev.comentario).subscribe({
      next: (appr) => {
        if (appr) {
          // Cerrar la modal de documento después del éxito
          this.isApprovalDocumentViewVisible = false;
          this.updateRequestStatus(appr.id, 'APROBADO', 'Aprobada');
          this.subscribeToApprovals(); // Refresh the list
          // Mostrar mensaje de éxito
          alert('Solicitud aprobada exitosamente.');
        }
      },
      error: (error) => {
        alert('Error al aprobar la solicitud. Por favor, inténtelo de nuevo.');
        // Reabrir la modal de documento para que el usuario pueda intentar nuevamente
        this.isApprovalDocumentViewVisible = true;
      }
    });
  }

  handleRejectRequest(ev: { id: string | number, comentario?: string }) {
    const uid = this.currentUser?.noUsuario;
    if (!uid) return;
    this.approvalService.rechazarSolicitud(ev.id, uid, ev.comentario).subscribe({
      next: (appr) => {
        if (appr) {
          // Cerrar la modal de documento después del éxito
          this.isApprovalDocumentViewVisible = false;
          this.updateRequestStatus(appr.id, 'RECHAZADO', 'Rechazada');
          this.subscribeToApprovals(); // Refresh the list
          // Mostrar mensaje de éxito
          alert('Solicitud rechazada exitosamente.');
        }
      },
      error: (error) => {
        alert('Error al rechazar la solicitud. Por favor, inténtelo de nuevo.');
        // Reabrir la modal de documento para que el usuario pueda intentar nuevamente
        this.isApprovalDocumentViewVisible = true;
      }
    });
  }

  private updateRequestStatus(id: string | number, approvalStatus: 'APROBADO' | 'RECHAZADO', fullDataStatus: 'Aprobada' | 'Rechazada') {
    this.approvalService.getApprovalDetails(id, this.allUsers).subscribe(request => {
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

  onToggleManaged(value: boolean): void { this.showOnlyManaged = value; this.currentPage = 1; this.refreshApprovalsSource(); }
  onQuantityChange(quantity: number): void { this.itemsPerPage = Number(quantity); this.currentPage = 1; this.applyViewLogic(); }
  onSearchChange(term: string): void { this.searchTerm = term; this.currentPage = 1; this.applyViewLogic(); }
  onChangePage(newPage: number): void { this.currentPage = newPage; this.applyViewLogic(); }
  sortBy(field: string): void { if (this.currentOrder === field) { this.ascendingOrder = !this.ascendingOrder; } else { this.currentOrder = field; this.ascendingOrder = true; } this.applyViewLogic(); }
}