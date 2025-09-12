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
import { SuccessModalService } from '../../services/success-modal.service';
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
    private successModalService: SuccessModalService,
    private typologyService: TypologyService,
    private authService: AuthService,
    private userService: UserService
    ) {}

  ngOnInit(): void {
    this.authService.getCurrentUser().subscribe(u => {
      if (u) {
        this.currentUserId = u.idUsuario;
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
    const currentUser = currentUserData ? this.convertUsuarioDataToUsuario(currentUserData) : undefined;
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

  private convertUsuarioDataToUsuario(usuarioData: any): Usuario {
    // Buscar el área real en la lista de áreas disponibles
    const areaReal = this.findAreaByName(usuarioData.cargo?.area || '');
    
    return {
      noUsuario: usuarioData.idUsuario,
      idUsuario: usuarioData.idUsuario,
      identificacion: usuarioData.identificacion,
      nombres: usuarioData.nombres,
      apellidos: usuarioData.apellidos,
      usuario: usuarioData.usuario,
      estado: {
        idEstado: 1,
        descripcion: usuarioData.estado || 'Activo'
      },
      activo: usuarioData.estado === 'Activo',
      cargo: {
        idCargo: usuarioData.cargo?.idCargo || 0,
        descripcion: usuarioData.cargo?.descripcion || '',
        area: {
          idArea: areaReal?.idArea || 0,
          descripcion: usuarioData.cargo?.area || '',
          departamento: {
            idDepartamento: 0,
            descripcion: usuarioData.cargo?.departamento || ''
          }
        }
      },
      rol: {
        idRol: 0,
        descripcion: usuarioData.rol || 'Usuario'
      },
      correoEmpresarial: usuarioData.correoEmpresarial,
      correoPersonal: usuarioData.correoPersonal,
      telefono1: usuarioData.telefono1,
      telefono2: usuarioData.telefono2,
      direccion: usuarioData.direccion,
      dobleAutenticacion: false // Valor por defecto
    };
  }

  private findAreaByName(areaName: string): any {
    // Buscar en las tipologías para encontrar el área correcta
    const typology = this.tipologias.find(t => t.cargo?.area?.descripcion === areaName);
    return typology?.cargo?.area;
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
