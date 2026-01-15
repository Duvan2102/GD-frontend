import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { Controls } from '../approvals/controls/controls';
import { RequestsTable } from '../approvals/requests-table/requests-table';
import { FooterControls } from '../approvals/footer-controls/footer-controls';
import { RequestSuccessModal, SuccessModalData, ProcessUpdatePayload } from '../create-request/request-success-modal/request-success-modal';
import { DocumentView, DocumentViewData } from '../create-request/document-view/document-view';
import { ApprovalService } from '../../services/approval.service';
import { SuccessModalService } from '../../services/success-modal.service';
import { Subscription, combineLatest } from 'rxjs';
import { distinctUntilChanged, shareReplay } from 'rxjs/operators';
import { Approval } from '../approvals/approvals';
import { Typology, TypologyService } from '../../services/typology.service';
import { UsuarioData } from '../../interfaces/common.interfaces';
import { AuthService } from '../../services/auth.service';
import { Usuario } from '../../interfaces/common.interfaces';
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
  currentUser: UsuarioData | null = null;

  // Propiedades para document-view
  isDocumentViewVisible = false;
  documentViewData: DocumentViewData | null = null;

  // Propiedades para la modal de metadata
  isDetailModalVisible = false;
  successModalData: SuccessModalData | null = null;
  isLoadingDetails = false;
  isProcessorMode = false; // Indica si el usuario actual es procesador
  canAssignProcessors = false; // Indica si se puede asignar procesadores

  constructor(
    private approvalService: ApprovalService,
    private successModalService: SuccessModalService,
    private typologyService: TypologyService,
    private authService: AuthService,
    private userService: UserService
    ) {}

  ngOnInit(): void {
    this.authService.getCurrentUser()
      .pipe(distinctUntilChanged((prev, curr) => prev?.idUsuario === curr?.idUsuario))
      .subscribe(u => {
        if (u) {
          this.currentUserId = u.idUsuario;
          this.currentUser = u;
          this.loadInitialData();
        }
      });
  }

  ngOnDestroy(): void {
    this.approvalsSubscription?.unsubscribe();
  }

  loadInitialData(): void {
    this.isLoading = true;
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
    if (!this.currentUserId || this.allUsers.length === 0) return;
    this.isLoading = true;
    // Usar el nuevo método que trae todas las solicitudes del área
    this.approvalsSubscription = this.approvalService.getApprovalsByArea(this.currentUserId, this.allUsers)
      .subscribe(approvals => {
        this.approvalsList = approvals;
        this.applyViewLogic();
        this.isLoading = false;
      });
  }

  applyViewLogic(): void {
    const currentUserData = this.authService.getCurrentUserValue();
    const currentUser = currentUserData ? this.allUsers.find(u => u.noUsuario === currentUserData.idUsuario) : undefined;
    const { displayedRequests, totalFiltered } = applyApprovalDetailsViewLogic(
      this.approvalsList,
      this.showOnlyManaged,
      this.searchTerm,
      this.currentOrder,
      this.ascendingOrder,
      this.itemsPerPage,
      this.currentPage,
      this.tipologias,
      this.allUsers,
      currentUser
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
          // Detectar si el usuario es procesador
          if (uid) {
            this.isProcessorMode = this.detectProcessorMode(requestDetails.fullData, uid);
          } else {
            this.isProcessorMode = false;
          }
          // Determinar si se puede asignar procesadores
          this.canAssignProcessors = this.canAssignProcessorsToRequest(requestDetails.fullData);
          this.isDetailModalVisible = true;
        }
        this.isLoadingDetails = false;
      });
  }

  /**
   * Detecta si el usuario actual es procesador de la solicitud
   */
  private detectProcessorMode(data: SuccessModalData | null, userId: number): boolean {
    if (!data) return false;
    
    const estado = data.estado;
    const estadoUpper = estado ? String(estado).toUpperCase().trim() : '';
    const isAprobPendiente = estadoUpper === 'APROB-PENDIENTE' || 
                            estadoUpper === 'APROB_PENDIENTE' || 
                            estadoUpper === 'APROBADO PROCESO';
    
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

  private canAssignProcessorsToRequest(data: SuccessModalData | null): boolean {
    if (!data) return false;
    
    // Verificar que requiereProceso sea true
    if (data.requiereProceso !== true) return false;
    
    // Verificar que el estado sea "APROBADO PROCESO"
    const estado = data.estado;
    const estadoUpper = estado ? String(estado).toUpperCase().trim() : '';
    if (estadoUpper !== 'APROBADO PROCESO') return false;
    
    // Verificar si ya hay procesadores asignados en diferentes ubicaciones
    const fullData = (data as any).fullData || data;
    
    // Verificar en procesadores directos
    const procesadores = fullData.procesadores || 
                        fullData.procesadoresAsignados || 
                        fullData.procesadoresPostAprobacion ||
                        [];
    
    if (Array.isArray(procesadores) && procesadores.length > 0) {
      return false;
    }
    
    // Verificar en destinatarios con esProcesador: true
    const destinatarios = data.destinatarios || [];
    const procesadoresEnDestinatarios = destinatarios.filter((dest: any) => 
      dest.esProcesador === true || dest.esProcesador === 'true'
    );
    
    // Si ya hay procesadores en los destinatarios, no se puede asignar más (modo lectura)
    if (procesadoresEnDestinatarios.length > 0) {
      return false;
    }
    
    return true;
  }

  closeDetailModal(): void {
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
      }
    }

    // Para todas las demás solicitudes, obtener el PDF del servidor
    if (data.id && this.currentUserId) {
      this.isLoadingDetails = true;

      this.approvalService.getDocumentPdf(data.id, this.currentUserId).subscribe({
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

  closeDocumentView(): void {
    this.isDocumentViewVisible = false;
    this.documentViewData = null;
  }

  handleAssignProcess(payload: ProcessUpdatePayload): void {
    if (!this.currentUserId || !payload.requestId) {
      this.successModalService.showSuccess('Error', 'No se puede asignar el proceso. Usuario o solicitud no disponible.');
      return;
    }

    const procesadores = payload.procesadores || [];
    const archivos = payload.attachments || [];
    
    // Si hay procesadores, asignarlos
    if (procesadores.length > 0) {
      this.approvalService.agregarProcesadores(
        payload.requestId,
        this.currentUserId,
        procesadores
      ).subscribe({
        next: () => {
          // Si también hay archivos, subirlos después de asignar procesadores
          if (archivos.length > 0 && payload.requestId) {
            this.uploadAttachments(payload.requestId, archivos);
          } else {
            this.successModalService.showSuccess('Éxito', 'Procesadores asignados exitosamente');
            // Recargar los detalles de la solicitud
            if (payload.requestId) {
              this.showDetailsModal(String(payload.requestId));
            }
          }
        },
        error: (error) => {
          let errorMessage = 'Error al asignar los procesadores. Por favor, inténtelo de nuevo.';
          if (error.status === 400) {
            errorMessage = error.error?.message || 'Datos inválidos';
          } else if (error.status === 403) {
            errorMessage = 'No tiene permisos para asignar procesadores';
          }
          this.successModalService.showSuccess('Error', errorMessage);
        }
      });
    } else if (archivos.length > 0 && payload.requestId) {
      // Si solo hay archivos (sin procesadores), subirlos directamente
      this.uploadAttachments(payload.requestId, archivos);
    } else if (payload.comment && payload.comment.trim()) {
      // Si solo hay comentario, solo mostrar mensaje (no hay endpoint para solo comentario)
      this.successModalService.showSuccess('Información', 'Comentario registrado localmente');
    }
  }

  /**
   * Sube archivos adjuntos a una solicitud
   */
  private uploadAttachments(requestId: string | number, archivos: File[]): void {
    if (!this.currentUserId || archivos.length === 0) return;

    this.approvalService.agregarAdjuntos(
      requestId,
      this.currentUserId,
      archivos,
      undefined // No hay comentario en este contexto
    ).subscribe({
      next: () => {
        this.successModalService.showSuccess('Éxito', 'Archivos adjuntos cargados exitosamente');
        // Recargar los detalles de la solicitud
        this.showDetailsModal(String(requestId));
      },
      error: (error) => {
        let errorMessage = 'Error al cargar los archivos adjuntos. Por favor, inténtelo de nuevo.';
        if (error.status === 400) {
          errorMessage = error.error?.message || 'Datos inválidos';
        } else if (error.status === 413) {
          errorMessage = 'Los archivos son demasiado grandes. El tamaño total no debe exceder el límite permitido.';
        }
        this.successModalService.showSuccess('Error', errorMessage);
      }
    });
  }
}
