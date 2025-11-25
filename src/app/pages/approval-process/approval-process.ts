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
import { combineLatest } from 'rxjs';
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
  status: 'PENDIENTE' | 'APROBADO' | 'RECHAZADO' | 'CANCELADA' | 'APROB-PENDIENTE';
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
  isDetailModalVisible = false;
  successModalData: SuccessModalData | null = null;
  allUsers: Usuario[] = [];
  tipologias: Typology[] = [];
  displayedRequests: any[] = [];
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
  isProcessorMode = false;

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
        this.pendingApprovals = (list || []) as Approval[];
        this.refreshApprovalsSource();
      },
      error: (error) => {
        this.pendingApprovals = [];
        this.refreshApprovalsSource();
      }
    });
    
    // Para gestionados, mantener los estados finales tradicionales
    this.approvalService.getHistorico(uid, this.allUsers).subscribe({
      next: (list) => {
        this.managedApprovals = (list || []).filter(a => {
          const status = a.status;
          return ['APROBADO','RECHAZADO','CANCELADA'].includes(status);
        }) as Approval[];
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

  closeDocumentView(): void {
    this.isDocumentViewVisible = false;
    this.documentViewData = null;
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

    const solicitudId = ev.id;
    const comentario = ev.comentario?.trim() || '';

    this.aprobarProcesoConValidacion(solicitudId, uid, comentario);
  }

  private aprobarProcesoConValidacion(solicitudId: string | number, usuarioId: number, comentario: string, closeDetailModal: boolean = false): void {
    this.approvalService.aprobarSolicitud(solicitudId, usuarioId, comentario).subscribe({
      next: (appr) => {
        if (appr) {
          this.isApprovalDocumentViewVisible = false;
          
          // Si viene desde Cargar Proceso, cerrar también el modal de detalles
          if (closeDetailModal) {
            this.isDetailModalVisible = false;
            this.successModalData = null;
          }

          // Actualizar estado y recargar
          this.updateRequestStatus(appr.id, 'APROBADO', 'Aprobada');
          this.subscribeToApprovals();
          this.successModalService.showSuccess('Proceso completado', 'La solicitud ha sido aprobada exitosamente y notificada a los usuarios correspondientes.');
        }
      },
      error: (error) => {
        let errorMessage = 'Error al completar el proceso. Por favor, inténtelo de nuevo.';
        if (error.error?.message) {
          errorMessage = error.error.message;
        }
        if (closeDetailModal) {
          this.successModalService.showSuccess('Error', errorMessage);
        } else {
          alert(errorMessage);
          this.isApprovalDocumentViewVisible = true;
        }
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

  handleProcessUpdate(update: ProcessUpdatePayload): void {
    if (!this.currentUser?.idUsuario || !update.requestId) {
      this.successModalService.showSuccess('Error', 'No se puede cargar el proceso. Usuario o solicitud no disponible.');
      return;
    }

    const uid = this.currentUser.idUsuario;
    const archivos = update.attachments || [];
    const comentario = update.comment?.trim() || '';

    if (archivos.length === 0 && !comentario) {
      this.successModalService.showSuccess(
        'Información',
        'Debe proporcionar al menos un archivo o un comentario para cargar el proceso.'
      );
      return;
    }

    const solicitudId = update.requestId;
    const hasFiles = archivos.length > 0;

    if (hasFiles) {
      this.approvalService.agregarAdjuntos(solicitudId, uid, archivos, comentario).subscribe({
        next: () => {
          this.aprobarProcesoDesdeCargarProceso(solicitudId, uid, comentario);
        },
        error: (error) => {
          let errorMessage = 'Error al adjuntar los archivos. Por favor, inténtelo de nuevo.';
          if (error.status === 400) {
            errorMessage = error.error?.message || 'Datos inválidos. Verifique que los archivos sean válidos.';
          } else if (error.status === 413) {
            errorMessage = 'Los archivos son demasiado grandes. El tamaño total no debe exceder el límite permitido.';
          } else if (error.status === 415) {
            errorMessage = 'Tipo de archivo no permitido. Por favor, verifique los formatos de los archivos.';
          }
          this.successModalService.showSuccess('Error', errorMessage);
        }
      });
    } else if (comentario) {
      this.approvalService.agregarAdjuntos(solicitudId, uid, [], comentario).subscribe({
        next: () => {
          this.aprobarProcesoDesdeCargarProceso(solicitudId, uid, comentario);
        },
        error: (error) => {
          let errorMessage = 'Error al adjuntar el comentario. Por favor, inténtelo de nuevo.';
          if (error.status === 400) {
            errorMessage = error.error?.message || 'Error al adjuntar el comentario.';
          }
          this.successModalService.showSuccess('Error', errorMessage);
        }
      });
    }
  }

  private aprobarProcesoDesdeCargarProceso(solicitudId: string | number, usuarioId: number, comentario: string): void {
    this.aprobarProcesoConValidacion(solicitudId, usuarioId, comentario, true);
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
