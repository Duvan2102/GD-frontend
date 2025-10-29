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
import { Usuario, UsuarioData } from '../../interfaces/common.interfaces';
import { UserService } from '../../services/user.service';
import { TypologyService, Typology } from '../../services/typology.service';
import { ApprovalService } from '../../services/approval.service';
import { SuccessModalService } from '../../services/success-modal.service';
import { Observable, of, Subscription, combineLatest } from 'rxjs';
import { distinctUntilChanged, shareReplay } from 'rxjs/operators';
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
  currentUser: UsuarioData | null = null;
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
  isCreatingRequest = false;

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
    this.authService.getCurrentUser()
      .pipe(distinctUntilChanged((prev, curr) => prev?.idUsuario === curr?.idUsuario))
      .subscribe(user => {
        this.currentUser = user;
        if (user) {
          this.loadInitialData();
        }
      });
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

  ngOnDestroy(): void {
    this.approvalsSubscription?.unsubscribe();
  }

  subscribeToApprovals(): void {
    if (!this.currentUser) return;
    this.approvalsSubscription = this.approvalService.getApprovalsByCreator(this.currentUser.idUsuario, this.allUsers)
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

    const idSolicitante = this.currentUser.idUsuario;
    const idTipologia = Number(solicitudData.tipologia);

    const destinatariosIds: number[] = solicitudData.destinatarios
      .filter(d => d.noUsuarioId && d.noUsuarioId > 0)
      .map(d => d.noUsuarioId as number);

    if (destinatariosIds.length === 0) {
      alert('Debes seleccionar al menos un destinatario válido. Si el listado de usuarios no carga, intenta recargar la página.');
      return;
    }

    // Cerrar todas las modales y vistas antes de comenzar la creación
    this.isCreateModalVisible = false;
    this.isDocumentViewVisible = false;

    // Activar overlay de carga
    this.isCreatingRequest = true;

    const pdf = solicitudData.documentoAprobacion as File;
    const adjuntos = solicitudData.anexos;

    this.approvalService.createSolicitud({
      idSolicitante,
      idTipologia,
      destinatarios: destinatariosIds,
      ordenFirma: solicitudData.establecerOrden,
      comentarioInicial: solicitudData.detallesAdicionales,
      nombreSolicitud: solicitudData.nombreSolicitud,
      prioridad: solicitudData.prioridad,
      enviarRecordatorio: solicitudData.enviarRecordatorio,
      pdfPrincipal: pdf,
      adjuntos: adjuntos
    }).subscribe({
      next: (appr) => {
        this.isCreatingRequest = false; // Ocultar overlay de carga
        if (appr) {
          this.wasRequestCreatedSuccessfully = true; // Marcar que se creó exitosamente
          // Preparar datos para la success-modal - ya tenemos usuarios cargados
          this.successModalData = this.approvalService.mapToSuccessData(appr.fullData, this.allUsers);
          this.isDetailModalVisible = true;
        }
      },
      error: (error) => {
        this.isCreatingRequest = false; // Ocultar overlay de carga
        console.error('Error al crear la solicitud:', error);
        alert('Error al crear la solicitud. Por favor, inténtelo de nuevo.');
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
    this.hideSendButtonInDocumentView = true;

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

  closeDocumentView(): void {
    this.isDocumentViewVisible = false;
    // Reset document data to ensure fresh load on next open
    this.documentViewData = null;
  }

  handleCancelRequest(event: { solicitudId: string | number, comentario?: string }): void {
    const uid = this.currentUser?.idUsuario;
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
    const uid = this.currentUser?.idUsuario;
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
    const uid = this.currentUser?.idUsuario;
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
