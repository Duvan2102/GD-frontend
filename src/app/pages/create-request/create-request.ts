import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { Controls } from '../approvals/controls/controls';
import { RequestsTable } from '../approvals/requests-table/requests-table';
import { FooterControls } from '../approvals/footer-controls/footer-controls';
import { CreateForm, SolicitudData } from './create-form/create-form';
import { RequestSuccessModal, SuccessModalData } from './request-success-modal/request-success-modal';
import { DocumentView, DocumentViewData } from './document-view/document-view';
import { Usuario } from '../../interfaces/common.interfaces';
import { UserService } from '../../services/user.service';
import { TypologyService, Typology } from '../../services/typology.service';
import { ApprovalService } from '../../services/approval.service';
import { SuccessModalService } from '../../services/success-modal.service';
import { Observable, of, Subscription, combineLatest } from 'rxjs';
import { Approval } from '../approvals/approvals';
import { AuthService } from '../../services/auth.service';
import { applyViewLogic } from '../../utils/view.utils';

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
    RequestSuccessModal,
    DocumentView
  ],
  templateUrl: './create-request.html',
  styleUrls: ['./create-request.css']
})
export class CreateRequest implements OnInit, OnDestroy {
  isCreateModalVisible = false;
  isDetailModalVisible = false;
  successModalData: SuccessModalData | null = null;
  currentUser: Usuario | null = null;
  allUsers: Usuario[] = [];
  tipologias: Typology[] = [];
  approvalsList: Approval[] = [];
  private approvalsSubscription: Subscription | undefined;
  displayedRequests: Approval[] = [];
  private filteredRequests: Approval[] = [];
  totalFiltered: number = 0;
  searchTerm: string = '';
  showOnlyManaged: boolean = false;
  currentPage: number = 1;
  itemsPerPage: number = 10;
  currentOrder: string = 'creationDate';
  ascendingOrder: boolean = false;
  isLoading = true;
  isLoadingDetails = false;
  
  // Propiedades para document-view
  isDocumentViewVisible = false;
  documentViewData: DocumentViewData | null = null;
  hideSendButtonInDocumentView = true; // Por defecto oculto, se cambia según el contexto
  
  // Flags para controlar cuándo mostrar modal de éxito
  private wasRequestCreatedSuccessfully = false;
  private wasRequestCancelledSuccessfully = false;

  constructor(
    private userService: UserService,
    private typologyService: TypologyService,
    private approvalService: ApprovalService,
    private successModalService: SuccessModalService,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    this.authService.getCurrentUser().subscribe(user => {
      this.currentUser = user;
      this.loadInitialData();
    });

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

  ngOnDestroy(): void {
    this.approvalsSubscription?.unsubscribe();
  }

  subscribeToApprovals(): void {
    if (!this.currentUser) return;
    this.approvalsSubscription = this.approvalService.getApprovalsByCreator(this.currentUser.noUsuario, this.allUsers)
      .subscribe(approvals => {
        this.approvalsList = approvals;
        this.applyViewLogic();
        this.isLoading = false;
      });
  }

  openCreateModal(): void {
    this.isCreateModalVisible = true;
  }

  closeCreateModal(): void {
    this.isCreateModalVisible = false;
  }

  handleSaveRequest(solicitudData: SolicitudData): void {
    if (!this.currentUser) return;

    const idSolicitante = this.currentUser.noUsuario;
    const idTipologia = Number(solicitudData.tipologia);
    
    const destinatariosIds: number[] = solicitudData.destinatarios
      .filter(d => d.noUsuarioId && d.noUsuarioId > 0)
      .map(d => d.noUsuarioId as number);

    if (destinatariosIds.length === 0) {
      alert('Debes seleccionar al menos un destinatario válido. Si el listado de usuarios no carga, intenta recargar la página.');
      return;
    }

    const pdf = solicitudData.documentoAprobacion as File;
    const adjuntos = solicitudData.anexos;

    this.approvalService.createSolicitud({
      idSolicitante,
      idTipologia,
      destinatarios: destinatariosIds,
      ordenFirma: solicitudData.establecerOrden,
      comentarioInicial: solicitudData.detallesAdicionales,
      nombreSolicitud: solicitudData.nombreSolicitud,
      pdfPrincipal: pdf,
      adjuntos: adjuntos
    }).subscribe(appr => {
      if (appr) {
        this.wasRequestCreatedSuccessfully = true; // Marcar que se creó exitosamente
        // Preparar datos para la success-modal
        const ensureUsers$ = this.allUsers.length > 0 ? of(this.allUsers) : this.userService.obtenerUsuarios();
        ensureUsers$.subscribe((users: Usuario[]) => {
          this.allUsers = users;
          this.successModalData = this.approvalService.mapToSuccessData(appr.fullData, this.allUsers);
          this.isCreateModalVisible = false;
          this.isDetailModalVisible = true;
        });
      }
    });
  }

  closeDetailModal(): void {
    this.isDetailModalVisible = false;
    this.successModalData = null;
    
    // Mostrar modal de éxito como última acción en todos los casos
    if (this.wasRequestCreatedSuccessfully) {
      this.successModalService.showSuccess('Solicitud enviada', 'Tu solicitud ha sido creada y enviada exitosamente. Los aprobadores han sido notificados para su revisión.');
      this.wasRequestCreatedSuccessfully = false; // Resetear el flag
    } else if (this.wasRequestCancelledSuccessfully) {
      this.successModalService.showSuccess('Solicitud cancelada', 'La solicitud ha sido cancelada exitosamente y notificada a los aprobadores.');
      this.wasRequestCancelledSuccessfully = false; // Resetear el flag
    }
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
    
    this.hideSendButtonInDocumentView = true;
    
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

  handleCancelRequest(event: { solicitudId: string | number, comentario?: string }): void {
    const uid = this.currentUser?.noUsuario;
    if (!uid) return;
    this.approvalService.cancelarSolicitud(event.solicitudId, uid, event.comentario).subscribe({
      next: () => {
        // Marcar que se canceló exitosamente para mostrar modal de éxito al cerrar
        this.wasRequestCancelledSuccessfully = true;
        // Cerrar la modal de gestión después del éxito
        this.closeDetailModal();
        this.subscribeToApprovals();
      },
      error: (error) => {
        // Mostrar mensaje de error y reabrir la modal de gestión
        alert('Error al cancelar la solicitud. Por favor, inténtelo de nuevo.');
        // Reabrir la modal de gestión para que el usuario pueda intentar nuevamente
        this.isDetailModalVisible = true;
      }
    });
  }

  handleDeleteRequest(solicitudId: string | number): void {
    const uid = this.currentUser?.noUsuario;
    if (!uid) {
      return;
    }
    
    this.approvalService.deleteApproval(solicitudId, uid).subscribe({
      next: () => {
        this.subscribeToApprovals(); // Recargar la lista
      },
      error: (error) => {
        alert('Error al eliminar la solicitud. Por favor, inténtalo de nuevo.');
      }
    });
  }

  onManage(id: string): void {
    const uid = this.currentUser?.noUsuario;
    this.isLoadingDetails = true;
    this.approvalService.getApprovalDetails(id, this.allUsers, uid).pipe()
      .subscribe(request => {
        if (request && request.fullData) {
          // Usar directamente los datos ya procesados en lugar de mapear nuevamente
          this.successModalData = request.fullData;
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

  onToggleManaged(value: boolean): void { this.showOnlyManaged = value; this.currentPage = 1; this.applyViewLogic(); }
  onQuantityChange(quantity: number): void { this.itemsPerPage = Number(quantity); this.currentPage = 1; this.applyViewLogic(); }
  onSearchChange(term: string): void { this.searchTerm = term; this.currentPage = 1; this.applyViewLogic(); }
  onChangePage(newPage: number): void { this.currentPage = newPage; this.applyViewLogic(); }
  sortBy(field: string): void { if (this.currentOrder === field) { this.ascendingOrder = !this.ascendingOrder; } else { this.currentOrder = field; this.ascendingOrder = true; } this.applyViewLogic(); }
}