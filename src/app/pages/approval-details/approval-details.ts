import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { Controls } from '../approvals/controls/controls';
import { RequestsTable } from '../approvals/requests-table/requests-table';
import { FooterControls } from '../approvals/footer-controls/footer-controls';
import { RequestSuccessModal, SuccessModalData } from '../create-request/request-success-modal/request-success-modal';
import { DocumentView, DocumentViewData } from '../create-request/document-view/document-view';
import { ApprovalService } from '../../services/approval.service';
import { Subscription, combineLatest } from 'rxjs';
import { Approval } from '../approvals/approvals';
import { Typology, TypologyService } from '../../services/typology.service';
import { AuthService } from '../../services/auth.service';
import { Usuario, UsuarioRequest, ApiResponse, ErrorResponse, DobleAutenticacionTipo } from '../../interfaces/common.interfaces';
import { UserService } from '../../services/user.service';
import { applyApprovalDetailsViewLogic } from '../../utils/view.utils';
import { delay } from 'rxjs/operators';

@Component({
  selector: 'app-approval-details',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    Controls,
    RequestsTable,
    FooterControls,
    RequestSuccessModal,
    DocumentView
  ],
  templateUrl: './approval-details.html',
  styleUrls: ['./approval-details.css']
})
export class ApprovalDetails implements OnInit, OnDestroy {
  approvalsList: Approval[] = [];
  private approvalsSubscription: Subscription | undefined;
  tipologias: Typology[] = [];
  allUsers: Usuario[] = [];

  displayedRequests: any[] = [];
  private filteredRequests: any[] = [];
  totalFiltered: number = 0;

  searchTerm: string = '';
  showOnlyManaged: boolean = false;
  currentPage: number = 1;
  itemsPerPage: number = 10;
  currentOrder: string = 'creationDate';
  ascendingOrder: boolean = false;
  isLoading = true;
  currentUserId?: number;
  
  // Propiedades para document-view
  isDocumentViewVisible = false;
  documentViewData: DocumentViewData | null = null;
  
  // Propiedades para la modal de metadata
  isDetailModalVisible = false;
  successModalData: SuccessModalData | null = null;
  isLoadingDetails = false;

  constructor(
    private approvalService: ApprovalService,
    private typologyService: TypologyService,
    private authService: AuthService,
    private userService: UserService
    ) {}

  ngOnInit(): void {
    this.authService.getCurrentUser().subscribe(u => {
      this.currentUserId = u.noUsuario;
      this.loadInitialData();
    });
  }

  ngOnDestroy(): void {
    this.approvalsSubscription?.unsubscribe();
  }

  loadInitialData(): void {
    this.isLoading = true;
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
    if (!this.currentUserId || this.allUsers.length === 0) return;
    this.isLoading = true;
    this.approvalsSubscription = this.approvalService.getHistorico(this.currentUserId, this.allUsers)
      .subscribe(approvals => {
        this.approvalsList = approvals;
        this.applyViewLogic();
        this.isLoading = false;
      });
  }

  applyViewLogic(): void {
    const { displayedRequests, totalFiltered } = applyApprovalDetailsViewLogic(
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

  onToggleManaged(value: boolean): void {
    this.showOnlyManaged = value;
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
    // Siempre mostrar detalles completos, independientemente del toggle
    this.showDetailsModal(id);
  }

  private showDetailsModal(id: string): void {
    this.isLoadingDetails = true;
    const uid = this.currentUserId;
    
    this.approvalService.getApprovalDetails(id, this.allUsers, uid).pipe(delay(500))
      .subscribe(requestDetails => {
        if (requestDetails) {
          this.successModalData = requestDetails.fullData;
          this.isDetailModalVisible = true;
        }
        this.isLoadingDetails = false;
      });
  }

  closeDetailModal(): void {
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
    
    if (!documentFile && !documentUrl && data?.pdfOriginalName && this.currentUserId) {
      this.isLoadingDetails = true;
      
      this.approvalService.getDocumentPdf(data.id!, this.currentUserId).subscribe({
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
}