import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { Controls } from '../approvals/controls/controls';
import { RequestsTable } from '../approvals/requests-table/requests-table';
import { FooterControls } from '../approvals/footer-controls/footer-controls';
import { RequestSuccessModal, SuccessModalData, ProcessUpdatePayload } from '../create-request/request-success-modal/request-success-modal';
import { ApprovalDocumentView, ApprovalDocumentViewData } from '../approvals/approval-document-view/approval-document-view';
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
  status: 'APROBADO' | 'RECHAZADO' | 'PENDIENTE' | 'CANCELADA';
  approvers: { initials: string; fullName: string }[];
  priority: boolean;
  fullData?: any;
  _creadorId?: number;
}

@Component({
  selector: 'app-approval-process',
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
  templateUrl: './approval-process.html',
  styleUrls: ['./approval-process.css']
})
export class ApprovalProcess implements OnInit, OnDestroy {
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

  // Propiedades para document-view
  isDocumentViewVisible = false;
  documentViewData: DocumentViewData | null = null;

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
    
    // Obtener historial de aprobaciones gestionadas
    this.approvalService.getHistorico(uid, this.allUsers).subscribe({
      next: (list) => {
        this.managedApprovals = (list || []).filter(a => ['APROBADO','RECHAZADO','CANCELADA'].includes(a.status));
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
    // Verificar si tenemos un File object en memoria (para solicitudes recién creadas)
    const mainDocumentFile = data?.documentoAprobacion ||
                            (data as any)?.documento ||
                            (data as any)?.archivo ||
                            (data as any)?.file;

    // Si tenemos el archivo en memoria (solicitud recién creada), usarlo directamente
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

    // Para todas las demás solicitudes, obtener el PDF del servidor
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
      // Si no hay ID o usuario, mostrar error
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
    // Usar el endpoint correcto del backend para obtener el PDF
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

        // Si tenemos información del documento, mostrarla aunque no se pueda cargar
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
          // Como último recurso, intentar obtener adjuntos
          this.tryGetAttachments(data);
        }
      }
    });
  }

  private tryGetDocumentWithFallback(data: SuccessModalData): void {
    // Usar el endpoint correcto del backend para obtener el PDF
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
          // Usar el primer adjunto como documento
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
          // No hay adjuntos, intentar construir URL directa
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
    // Intentar diferentes patrones de URL basándose en la estructura de la API
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
      
      // Crear una imagen para probar si la URL es válida
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
    const uid = this.currentUser?.idUsuario;
    if (!uid) return;
    this.approvalService.aprobarSolicitud(ev.id, uid, ev.comentario).subscribe({
      next: (appr) => {
        if (appr) {
          // Cerrar la modal de documento después del éxito
          this.isApprovalDocumentViewVisible = false;
          this.updateRequestStatus(appr.id, 'APROBADO', 'Aprobada');
          this.subscribeToApprovals(); // Refresh the list
          // Mostrar mensaje de éxito como última acción
          this.successModalService.showSuccess('Aprobación completada', 'La solicitud ha sido aprobada exitosamente y notificada a los usuarios correspondientes.');
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
    const uid = this.currentUser?.idUsuario;
    if (!uid) return;
    this.approvalService.rechazarSolicitud(ev.id, uid, ev.comentario).subscribe({
      next: (appr) => {
        if (appr) {
          // Cerrar la modal de documento después del éxito
          this.isApprovalDocumentViewVisible = false;
          this.updateRequestStatus(appr.id, 'RECHAZADO', 'Rechazada');
          this.subscribeToApprovals(); // Refresh the list
          // Mostrar mensaje de éxito como última acción
          this.successModalService.showSuccess('Rechazo completado', 'La solicitud ha sido rechazada exitosamente y notificada al solicitante.');
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
    // Obtener los detalles más actualizados del servidor
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
        // Fallback: actualizar localmente si falla la consulta al servidor
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

  handleProcessUpdate(update: ProcessUpdatePayload): void {
    console.debug('Actualización manual del proceso', update);
    this.successModalService.showSuccess(
      'Actualización registrada',
      'La información se actualizó correctamente y quedó trazada en el proceso.'
    );
  }

  onToggleManaged(value: boolean): void { this.showOnlyManaged = value; this.currentPage = 1; this.refreshApprovalsSource(); }
  onQuantityChange(quantity: number): void { this.itemsPerPage = Number(quantity); this.currentPage = 1; this.applyViewLogic(); }
  onSearchChange(term: string): void { this.searchTerm = term; this.currentPage = 1; this.applyViewLogic(); }
  onChangePage(newPage: number): void { this.currentPage = newPage; this.applyViewLogic(); }
  sortBy(field: string): void { if (this.currentOrder === field) { this.ascendingOrder = !this.ascendingOrder; } else { this.currentOrder = field; this.ascendingOrder = true; } this.applyViewLogic(); }
}
