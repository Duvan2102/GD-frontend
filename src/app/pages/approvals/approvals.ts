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
import { Usuario, UsuarioData } from '../../interfaces/common.interfaces';
import { UserService } from '../../services/user.service';
import { ApprovalService } from '../../services/approval.service';
import { SuccessModalService } from '../../services/success-modal.service';
import { Subscription, combineLatest } from 'rxjs';
import { distinctUntilChanged, shareReplay } from 'rxjs/operators';
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
  status: 'PENDIENTE' | 'APROBADO' | 'RECHAZADO' | 'CANCELADA' | 'APROB-PENDIENTE' | 'APROB-POCESADO';
  approvers: { initials: string; fullName: string }[];
  priority: boolean;
  fullData?: any;
  _creadorId?: number;
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
  currentUser: UsuarioData | null = null;

  isDocumentViewVisible = false;
  documentViewData: DocumentViewData | null = null;

  externalAlerts: Array<{
    type: 'success' | 'danger' | 'info' | 'warning';
    title: string;
    message: string;
  }> = [];


  constructor(
    private userService: UserService,
    private approvalService: ApprovalService,
    private successModalService: SuccessModalService,
    private authService: AuthService,
    private typologyService: TypologyService
  ) {}

  ngOnInit(): void {
    this.authService.getCurrentUser()
      .pipe(distinctUntilChanged((prev, curr) => prev?.idUsuario === curr?.idUsuario))
      .subscribe(user => {
        this.currentUser = user;
        if (user) {
          this.loadUsersAndApprovals();
        }
      });
  }

  ngOnDestroy(): void {
    this.approvalsSubscription?.unsubscribe();
  }

  loadUsersAndApprovals(): void {
    combineLatest([
      this.userService.obtenerUsuarios().pipe(shareReplay(1)),
      this.typologyService.getAll().pipe(shareReplay(1))
    ]).pipe(
      distinctUntilChanged((prev, curr) => {
        const [prevUsers, prevTypologies] = prev;
        const [currUsers, currTypologies] = curr;
        return prevUsers.length === currUsers.length && 
               prevTypologies.length === currTypologies.length;
      })
    ).subscribe(([users, typologies]) => {
      this.allUsers = users;
      this.tipologias = typologies;
      this.subscribeToApprovals();
    });
  }

  subscribeToApprovals(): void {
    if (!this.currentUser) return;
    const uid = this.currentUser.idUsuario;
    
    // Obtener aprobaciones pendientes
    this.approvalService.getApprovalsForApprover(uid, this.allUsers).subscribe({
      next: (list) => {
        this.pendingApprovals = list || [];
        this.refreshApprovalsSource();
      },
      error: (error) => {
        this.pendingApprovals = [];
        this.refreshApprovalsSource();
      }
    });
    
    this.approvalService.getHistorico(uid, this.allUsers).subscribe({
      next: (list) => {
        this.managedApprovals = (list || []).filter(a => {
          const status = a.status?.toUpperCase();
          return ['APROBADO','RECHAZADO','CANCELADA','APROB-POCESADO'].includes(status);
        });
        this.refreshApprovalsSource();
      },
      error: (error) => {
        this.managedApprovals = [];
        this.refreshApprovalsSource();
      }
    });
  }

  private refreshApprovalsSource(): void {
    this.approvalsList = this.showOnlyManaged ? this.managedApprovals : this.pendingApprovals;
    this.applyViewLogic();
  }

  onManage(id: string): void {
    this.isLoadingDetails = true;
    const uid = this.currentUser?.idUsuario;
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
    const mainDocumentFile = data?.documentoAprobacion ||
                            (data as any)?.documento ||
                            (data as any)?.archivo ||
                            (data as any)?.file;

    if (mainDocumentFile && mainDocumentFile instanceof File) {
      try {
        const documentUrl = URL.createObjectURL(mainDocumentFile);
        this.documentViewData = {
          id: data.id!,
          file: mainDocumentFile,
          url: documentUrl,
          title: data.nombreSolicitud,
          fileName: data.documentoFileName || data.pdfOriginalName || mainDocumentFile.name || 'Documento Principal'
        };
        this.isDetailModalVisible = false;
        this.isDocumentViewVisible = true;
        return;
      } catch (error) {
        console.error('Error creating object URL:', error);
      }
    }

    if (data.id && this.currentUser?.idUsuario) {
      this.isLoadingDetails = true;

      this.approvalService.getDocumentPdf(data.id, this.currentUser.idUsuario).subscribe({
        next: (pdfBlob: Blob) => {
          const pdfUrl = URL.createObjectURL(pdfBlob);
          const fileName = data.pdfOriginalName || data.documentoFileName || `documento_${data.id}.pdf`;
          
          this.documentViewData = {
            id: data.id!,
            file: undefined,
            url: pdfUrl,
            title: data.nombreSolicitud,
            fileName: fileName,
            metadata: {
              pdfOriginalName: fileName,
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
          console.error('Error al cargar el documento desde el servidor:', error);
          this.isLoadingDetails = false;
          
          this.documentViewData = {
            id: data.id!,
            file: undefined,
            url: undefined,
            title: data.nombreSolicitud,
            fileName: data.pdfOriginalName || data.documentoFileName || 'Documento no disponible',
            metadata: {
              pdfOriginalName: data.pdfOriginalName || data.documentoFileName,
              pdfSizeBytes: data.pdfSizeBytes,
              isPdfMetadata: true,
              error: 'Error al cargar el documento desde el servidor. Verifique que el archivo existe.'
            }
          };
          this.isDetailModalVisible = false;
          this.isDocumentViewVisible = true;
        }
      });
    } else {
      this.documentViewData = {
        id: data.id!,
        file: undefined,
        url: undefined,
        title: data.nombreSolicitud,
        fileName: 'Documento no disponible',
        metadata: {
          error: 'No se pudo obtener la información del documento.'
        }
      };
      this.isDetailModalVisible = false;
      this.isDocumentViewVisible = true;
    }
  }

  private tryGetApprovalDocument(data: SuccessModalData): void {
    this.approvalService.getDocumentPdf(data.id!, this.currentUser!.idUsuario).subscribe({
      next: (pdfBlob: Blob) => {
        const pdfUrl = URL.createObjectURL(pdfBlob);
        const fileName = data.pdfOriginalName || data.documentoFileName || `documento_${data.id}.pdf`;
        
        this.documentViewData = {
          id: data.id!,
          file: undefined,
          url: pdfUrl,
          title: data.nombreSolicitud,
          fileName: fileName,
          metadata: {
            pdfOriginalName: fileName,
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
        console.error('Error obteniendo PDF del servidor:', error);
        this.isLoadingDetails = false;

        if (data.pdfOriginalName || data.documentoFileName) {
          this.documentViewData = {
            id: data.id!,
            file: undefined,
            url: undefined,
            title: data.nombreSolicitud,
            fileName: data.pdfOriginalName || data.documentoFileName || this.getDocumentTitle(data.estado),
            metadata: {
              pdfOriginalName: data.pdfOriginalName || data.documentoFileName,
              pdfSizeBytes: data.pdfSizeBytes,
              isPdfMetadata: true,
              error: `No se pudo cargar el ${this.getDocumentTitle(data.estado).toLowerCase()} desde el servidor, pero se tiene información del archivo: ${data.pdfOriginalName || data.documentoFileName}`
            }
          };
          this.isDetailModalVisible = false;
          this.isDocumentViewVisible = true;
        } else {
          this.tryGetAttachments(data);
        }
      }
    });
  }

  private tryGetDocumentWithFallback(data: SuccessModalData): void {
    this.approvalService.getDocumentPdf(data.id!, this.currentUser!.idUsuario).subscribe({
      next: (pdfBlob: Blob) => {
        const pdfUrl = URL.createObjectURL(pdfBlob);
        const fileName = data.pdfOriginalName || data.documentoFileName || `documento_${data.id}.pdf`;

        this.documentViewData = {
          id: data.id!,
          file: undefined,
          url: pdfUrl,
          title: data.nombreSolicitud,
          fileName: fileName,
          metadata: {
            pdfOriginalName: fileName,
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
        console.error('Error obteniendo PDF del servidor:', error);
        this.tryGetOriginalPdf(data);
      }
    });
  }

  private tryGetOriginalPdf(data: SuccessModalData): void {
    this.approvalService.getDocumentPdf(data.id!, this.currentUser!.idUsuario).subscribe({
      next: (pdfBlob: Blob) => {
        const pdfUrl = URL.createObjectURL(pdfBlob);
        
        this.documentViewData = {
          id: data.id!,
          file: undefined,
          url: pdfUrl,
          title: data.nombreSolicitud,
          fileName: data.pdfOriginalName || data.documentoFileName || this.getDocumentTitle(data.estado),
          metadata: {
            pdfOriginalName: data.pdfOriginalName || data.documentoFileName,
            pdfSizeBytes: data.pdfSizeBytes,
            isPdfMetadata: false,
            isPdfFromService: true
          }
        };
        this.isDetailModalVisible = false;
        this.isDocumentViewVisible = true;
        this.isLoadingDetails = false;
      },
      error: (pdfError) => {
        this.tryGetAttachments(data);
      }
    });
  }


  private tryGetAttachments(data: SuccessModalData): void {
    this.approvalService.getAttachments(data.id!, this.currentUser!.idUsuario).subscribe({
      next: (attachments) => {
        if (attachments && attachments.length > 0) {
          const attachment = attachments[0];
          this.documentViewData = {
            id: data.id!,
            file: undefined,
            url: undefined,
            title: data.nombreSolicitud,
            fileName: attachment.nombre || data.pdfOriginalName || this.getDocumentTitle(data.estado),
            metadata: {
              pdfOriginalName: attachment.nombre || data.pdfOriginalName,
              pdfSizeBytes: attachment.tamaño || data.pdfSizeBytes,
              isPdfMetadata: true,
              error: 'Documento obtenido de adjuntos - puede requerir descarga manual'
            }
          };
        } else {
          this.tryConstructDirectUrl(data);
        }
        this.isDetailModalVisible = false;
        this.isDocumentViewVisible = true;
        this.isLoadingDetails = false;
      },
      error: (attachmentError) => {
        this.tryConstructDirectUrl(data);
      }
    });
  }

  private tryConstructDirectUrl(data: SuccessModalData): void {
    const baseUrl = 'http://200.7.99.74:8080/api';
    const possibleUrls = [
      `${baseUrl}/solicitudes/${data.id}/documento`,
      `${baseUrl}/solicitudes/${data.id}/pdf`,
      `${baseUrl}/documentos/${data.id}`,
      `${baseUrl}/solicitudes/${data.id}/archivo`
    ];

    let attempts = 0;
    const maxAttempts = possibleUrls.length;

    const tryNextUrl = () => {
      if (attempts >= maxAttempts) {
        this.showDocumentError(data, 'No se pudo obtener el documento del servidor, pero se tiene información del archivo');
        return;
      }

      const url = possibleUrls[attempts];
      
      const img = new Image();
      img.onload = () => {
        this.documentViewData = {
          id: data.id!,
          file: undefined,
          url: url,
          title: data.nombreSolicitud,
          fileName: data.pdfOriginalName || data.documentoFileName || this.getDocumentTitle(data.estado),
          metadata: {
            pdfOriginalName: data.pdfOriginalName || data.documentoFileName,
            pdfSizeBytes: data.pdfSizeBytes,
            isPdfMetadata: false,
            isPdfFromService: true
          }
        };
        this.isDetailModalVisible = false;
        this.isDocumentViewVisible = true;
        this.isLoadingDetails = false;
      };
      
      img.onerror = () => {
        attempts++;
        tryNextUrl();
      };
      
      img.src = url;
    };

    tryNextUrl();
  }

  private showDocumentError(data: SuccessModalData, errorMessage: string): void {
    this.isLoadingDetails = false;
    this.documentViewData = {
      id: data.id!,
      file: undefined,
      url: undefined,
      title: data.nombreSolicitud,
      fileName: data.pdfOriginalName || data.documentoFileName || this.getDocumentTitle(data.estado),
      metadata: {
        pdfOriginalName: data.pdfOriginalName || data.documentoFileName,
        pdfSizeBytes: data.pdfSizeBytes,
        isPdfMetadata: true,
        error: errorMessage
      }
    };
    this.isDetailModalVisible = false;
    this.isDocumentViewVisible = true;
  }

  closeDocumentView(): void {
    this.isDocumentViewVisible = false;
    this.documentViewData = null;
  }

  private getDocumentTitle(estado?: string): string {
    switch (estado) {
      case 'Aprobada':
        return 'Documento Aprobado';
      case 'Rechazada':
        return 'Documento Rechazado';
      case 'Cancelada':
        return 'Documento Cancelado';
      case 'Pendiente':
        return 'Documento de Solicitud';
      case 'Enviada':
        return 'Documento de Solicitud';
      default:
        return 'Documento';
    }
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
        const userId = this.currentUser?.idUsuario;
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
              this.showExternalAlert('danger', 'Error al cargar documento', 'Error al cargar el documento. Por favor, inténtalo de nuevo.');
            }
          });
        } else {
          this.showExternalAlert('warning', 'Documento no disponible', 'No se pudo cargar el documento. Verifique que la solicitud tenga un documento asociado.');
        }
      }
    }
  }

  handleApproveRequest(ev: { id: string | number, comentario?: string }) {
    const uid = this.currentUser?.idUsuario;
    if (!uid) return;
    this.approvalService.aprobarSolicitud(ev.id, uid, ev.comentario).subscribe({
      next: (appr) => {
        if (appr) {
          this.isApprovalDocumentViewVisible = false;
          this.updateRequestStatus(appr.id, 'APROBADO', 'Aprobada');
          this.subscribeToApprovals();
          this.successModalService.showSuccess('Aprobación completada', 'La solicitud ha sido aprobada exitosamente y notificada a los usuarios correspondientes.');
        }
      },
      error: (error) => {
        this.showExternalAlert('danger', 'Error al aprobar', 'Error al aprobar la solicitud. Por favor, inténtelo de nuevo.');
        this.isApprovalDocumentViewVisible = true;
      }
    });
  }

  handleRejectRequest(ev: { id: string | number, comentario?: string }) {
    const uid = this.currentUser?.idUsuario;
    if (!uid) return;
    this.approvalService.rechazarSolicitud(ev.id, uid, ev.comentario).subscribe({
      next: (appr) => {
        if (appr) {
          this.isApprovalDocumentViewVisible = false;
          this.updateRequestStatus(appr.id, 'RECHAZADO', 'Rechazada');
          this.subscribeToApprovals();
          this.successModalService.showSuccess('Rechazo completado', 'La solicitud ha sido rechazada exitosamente y notificada al solicitante.');
        }
      },
      error: (error) => {
        this.showExternalAlert('danger', 'Error al rechazar', 'Error al rechazar la solicitud. Por favor, inténtelo de nuevo.');
        this.isApprovalDocumentViewVisible = true;
      }
    });
  }

  private updateRequestStatus(id: string | number, approvalStatus: 'APROBADO' | 'RECHAZADO', fullDataStatus: 'Aprobada' | 'Rechazada') {
    this.approvalService.getApprovalDetails(id, this.allUsers, this.currentUser?.idUsuario).subscribe({
      next: (request) => {
        if (request) {
          request.status = approvalStatus;
          if (request.fullData) {
            request.fullData.estado = fullDataStatus;
          }
          this.approvalService.updateApproval(request);
        }
      },
      error: (error) => {
        const currentApprovals = this.approvalService.approvalsSubject.getValue();
        const approval = currentApprovals.find(a => a.id.toString() === id.toString());
        if (approval) {
          approval.status = approvalStatus;
          if (approval.fullData) {
            approval.fullData.estado = fullDataStatus;
          }
          this.approvalService.updateApproval(approval);
        }
      }
    });
  }

  closeApprovalDocumentView() {
    this.isApprovalDocumentViewVisible = false;
    this.documentToApproveData = null;
  }

  handleBackFromDocumentView() {
    this.isApprovalDocumentViewVisible = false;
    this.documentToApproveData = null;
    this.isDetailModalVisible = true;
  }

  onToggleManaged(value: boolean): void { this.showOnlyManaged = value; this.currentPage = 1; this.refreshApprovalsSource(); }
  onQuantityChange(quantity: number): void { this.itemsPerPage = Number(quantity); this.currentPage = 1; this.applyViewLogic(); }
  onSearchChange(term: string): void { this.searchTerm = term; this.currentPage = 1; this.applyViewLogic(); }
  onChangePage(newPage: number): void { this.currentPage = newPage; this.applyViewLogic(); }
  sortBy(field: string): void { if (this.currentOrder === field) { this.ascendingOrder = !this.ascendingOrder; } else { this.currentOrder = field; this.ascendingOrder = true; } this.applyViewLogic(); }

  showExternalAlert(type: 'success' | 'danger' | 'info' | 'warning', title: string, message: string, duration: number = 5000): void {
    const alertItem = { type, title, message };
    this.externalAlerts.push(alertItem);

    if (duration > 0) {
      setTimeout(() => {
        const index = this.externalAlerts.indexOf(alertItem);
        if (index > -1) {
          this.closeExternalAlert(index);
        }
      }, duration);
    }
  }

  closeExternalAlert(index: number): void {
    this.externalAlerts.splice(index, 1);
  }
}
