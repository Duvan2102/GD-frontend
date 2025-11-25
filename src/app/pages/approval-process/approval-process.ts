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
  status: 'PENDIENTE' | 'APROBADO' | 'RECHAZADO' | 'CANCELADA' | 'APROB-PENDIENTE' | 'APROB-POCESADO';
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
  isProcessorMode = false; // Indica si el usuario actual es procesador

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
    
    // Obtener todas las solicitudes asignadas al usuario como procesador (estado APROB_PENDIENTE)
    // getAll=true obtiene todas las páginas automáticamente
    this.approvalService.getApprovalsForProcessor(uid, this.allUsers, 0, 100, true).subscribe({
      next: (list) => {
        // El endpoint ya devuelve solo las asignadas al usuario como procesador
        const solicitudes = list || [];
        console.log(`[Approval Process] Solicitudes para procesar recibidas: ${solicitudes.length}`);
        if (solicitudes.length > 0) {
          console.log(`[Approval Process] Estados de las solicitudes:`, solicitudes.map(s => ({ id: s.id, status: s.status })));
          // Verificar que todas tengan el estado correcto
          const estados = solicitudes.map(s => s.status);
          const estadosUnicos = [...new Set(estados)];
          console.log(`[Approval Process] Estados únicos encontrados:`, estadosUnicos);
        }
        this.pendingApprovals = solicitudes;
        this.refreshApprovalsSource();
      },
      error: (error) => {
        console.error('[Approval Process] Error al obtener solicitudes para procesar:', error);
        this.pendingApprovals = [];
        this.refreshApprovalsSource();
      }
    });
    
    // Para gestionados, mantener los estados finales tradicionales
    this.approvalService.getHistorico(uid, this.allUsers).subscribe({
      next: (list) => {
        this.managedApprovals = (list || []).filter(a => {
          const status = a.status;
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
    console.log(`[Approval Process] refreshApprovalsSource - showOnlyManaged: ${this.showOnlyManaged}, approvalsList.length: ${this.approvalsList.length}`);
    if (this.approvalsList.length > 0) {
      console.log(`[Approval Process] Estados en approvalsList:`, [...new Set(this.approvalsList.map(a => a.status))]);
    }
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
        // Detectar si el usuario es procesador
        this.isProcessorMode = this.detectProcessorMode(requestDetails.fullData, uid);
        this.isDetailModalVisible = true;
      }
      this.isLoadingDetails = false;
    });
  }

  /**
   * Detecta si el usuario actual es procesador de la solicitud
   */
  private detectProcessorMode(data: SuccessModalData | null, userId: number | undefined): boolean {
    if (!data || !userId) return false;
    
    // Verificar si el estado es APROB_PENDIENTE
    const estado = data.estado;
    const estadoUpper = estado ? String(estado).toUpperCase().trim() : '';
    const isAprobPendiente = estadoUpper === 'APROB-PENDIENTE' || estadoUpper === 'APROB_PENDIENTE';
    
    if (!isAprobPendiente) return false;
    
    // Verificar si el usuario está asignado como procesador
    const fullData = (data as any).fullData || data;
    const procesadores = fullData.procesadores || 
                        fullData.procesadoresAsignados || 
                        fullData.procesadoresPostAprobacion ||
                        [];
    
    if (!Array.isArray(procesadores) || procesadores.length === 0) {
      return false;
    }
    
    // Verificar si el usuario está en la lista de procesadores
    return procesadores.some((proc: any) => {
      const procId = proc?.usuarioId || proc?.idUsuario || proc?.noUsuario || proc?.id || proc;
      const procIdNum = typeof procId === 'number' ? procId : parseInt(String(procId), 10);
      return !isNaN(procIdNum) && procIdNum === userId;
    });
  }

  applyViewLogic(): void {
    console.log(`[Approval Process] applyViewLogic - approvalsList.length: ${this.approvalsList.length}, showOnlyManaged: ${this.showOnlyManaged}`);
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
    console.log(`[Approval Process] applyViewLogic - totalFiltered: ${totalFiltered}, displayedRequests.length: ${displayedRequests.length}`);
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
    // Detectar si es procesador antes de abrir el documento
    const uid = this.currentUser?.idUsuario;
    if (uid) {
      this.isProcessorMode = this.detectProcessorMode(data, uid);
    }
    
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
          this.isApprovalDocumentViewVisible = false;
          // El endpoint unificado maneja tanto aprobadores como procesadores
          const status = this.isProcessorMode ? 'APROB-POCESADO' : 'APROBADO';
          const statusText = this.isProcessorMode ? 'Procesado' : 'Aprobada';
          this.updateRequestStatus(appr.id, status as any, statusText as any);
          this.subscribeToApprovals();
          const message = this.isProcessorMode 
            ? 'El proceso ha sido completado exitosamente y notificado a los usuarios correspondientes.'
            : 'La solicitud ha sido aprobada exitosamente y notificada a los usuarios correspondientes.';
          const title = this.isProcessorMode ? 'Proceso completado' : 'Aprobación completada';
          this.successModalService.showSuccess(title, message);
        }
      },
      error: (error) => {
        const errorMessage = this.isProcessorMode 
          ? 'Error al completar el proceso. Por favor, inténtelo de nuevo.'
          : 'Error al aprobar la solicitud. Por favor, inténtelo de nuevo.';
        alert(errorMessage);
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
        alert('Error al rechazar la solicitud. Por favor, inténtelo de nuevo.');
        this.isApprovalDocumentViewVisible = true;
      }
    });
  }

  private updateRequestStatus(id: string | number, approvalStatus: 'APROBADO' | 'RECHAZADO' | 'APROB-POCESADO', fullDataStatus: 'Aprobada' | 'Rechazada' | 'Procesado') {
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

  handleProcessUpdate(update: ProcessUpdatePayload): void {
    if (!this.currentUser?.idUsuario || !update.requestId) {
      this.successModalService.showSuccess('Error', 'No se puede cargar el proceso. Usuario o solicitud no disponible.');
      return;
    }

    const uid = this.currentUser.idUsuario;
    const archivos = update.attachments || [];
    const comentario = update.comment?.trim() || '';

    // Validar que haya al menos archivos o comentario
    if (archivos.length === 0 && !comentario) {
      this.successModalService.showSuccess(
        'Información',
        'Debe proporcionar al menos un archivo o un comentario para cargar el proceso.'
      );
      return;
    }

    // Obtener los detalles de la solicitud para verificar si es el último procesador
    this.approvalService.getApprovalDetails(update.requestId, this.allUsers, uid).subscribe({
      next: (requestDetails) => {
        if (!requestDetails || !requestDetails.fullData) {
          this.successModalService.showSuccess('Error', 'No se pudieron obtener los detalles de la solicitud.');
          return;
        }

        const fullData = requestDetails.fullData;
        const procesadores = fullData.procesadores || 
                            fullData.procesadoresAsignados || 
                            fullData.procesadoresPostAprobacion ||
                            [];

        // Verificar si el usuario actual es el último procesador
        const isLastProcessor = this.isLastProcessor(procesadores, uid);

        // Cargar archivos y comentario
        if (!update.requestId) {
          this.successModalService.showSuccess('Error', 'ID de solicitud no disponible.');
          return;
        }

        const hasFiles = archivos.length > 0;
        const uploadObservable = hasFiles
          ? this.approvalService.agregarAdjuntos(update.requestId, uid, archivos, comentario)
          : this.approvalService.agregarAdjuntos(update.requestId, uid, [], comentario);

        uploadObservable.subscribe({
          next: () => {
            // Si es el último procesador, aprobar la solicitud (cambiar estado a APROB-POCESADO)
            if (isLastProcessor && update.requestId) {
              this.approvalService.aprobarSolicitud(update.requestId, uid, comentario || 'Proceso completado').subscribe({
                next: (appr) => {
                  if (appr) {
                    this.successModalService.showSuccess(
                      'Proceso completado',
                      'El proceso ha sido completado exitosamente. La solicitud ha cambiado a estado APROB-POCESADO.'
                    );
                    // Cerrar el modal y recargar la lista
                    this.isDetailModalVisible = false;
                    this.successModalData = null;
                    this.subscribeToApprovals();
                  }
                },
                error: (error) => {
                  console.error('Error al completar el proceso:', error);
                  this.successModalService.showSuccess(
                    'Error',
                    'Los archivos y comentario se cargaron, pero hubo un error al completar el proceso. Por favor, inténtelo de nuevo.'
                  );
                  // Recargar los detalles
                  if (update.requestId) {
                    this.onManage(String(update.requestId));
                  }
                }
              });
            } else {
              // No es el último procesador, solo mostrar mensaje de éxito
              this.successModalService.showSuccess(
                'Proceso cargado',
                'El proceso se cargó correctamente. El siguiente procesador puede continuar con el proceso.'
              );
              // Cerrar el modal y recargar la lista
              this.isDetailModalVisible = false;
              this.successModalData = null;
              this.subscribeToApprovals();
            }
          },
          error: (error) => {
            console.error('Error al cargar el proceso:', error);
            let errorMessage = 'Error al cargar el proceso. Por favor, inténtelo de nuevo.';
            if (error.status === 400) {
              errorMessage = error.error?.message || 'Datos inválidos';
            } else if (error.status === 413) {
              errorMessage = 'Los archivos son demasiado grandes. El tamaño total no debe exceder el límite permitido.';
            }
            this.successModalService.showSuccess('Error', errorMessage);
          }
        });
      },
      error: (error) => {
        console.error('Error al obtener detalles de la solicitud:', error);
        this.successModalService.showSuccess('Error', 'No se pudieron obtener los detalles de la solicitud.');
      }
    });
  }

  /**
   * Verifica si el usuario actual es el último procesador en la lista
   */
  private isLastProcessor(procesadores: any[], userId: number): boolean {
    if (!Array.isArray(procesadores) || procesadores.length === 0) {
      return false;
    }

    // Normalizar los IDs de procesadores
    const procesadorIds = procesadores.map((proc: any) => {
      const procId = proc?.usuarioId || proc?.idUsuario || proc?.noUsuario || proc?.id || proc;
      return typeof procId === 'number' ? procId : parseInt(String(procId), 10);
    }).filter(id => !isNaN(id));

    // Encontrar el índice del usuario actual
    const currentUserIndex = procesadorIds.findIndex(id => id === userId);
    
    // Si no se encuentra el usuario, no es el último
    if (currentUserIndex === -1) {
      return false;
    }

    // Verificar si es el último en la lista
    return currentUserIndex === procesadorIds.length - 1;
  }

  onToggleManaged(value: boolean): void { this.showOnlyManaged = value; this.currentPage = 1; this.refreshApprovalsSource(); }
  onQuantityChange(quantity: number): void { this.itemsPerPage = Number(quantity); this.currentPage = 1; this.applyViewLogic(); }
  onSearchChange(term: string): void { this.searchTerm = term; this.currentPage = 1; this.applyViewLogic(); }
  onChangePage(newPage: number): void { this.currentPage = newPage; this.applyViewLogic(); }
  sortBy(field: string): void { if (this.currentOrder === field) { this.ascendingOrder = !this.ascendingOrder; } else { this.currentOrder = field; this.ascendingOrder = true; } this.applyViewLogic(); }
}
