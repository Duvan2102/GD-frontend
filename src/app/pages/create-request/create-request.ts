import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { Controls } from '../approvals/controls/controls';
import { RequestsTable } from '../approvals/requests-table/requests-table';
import { FooterControls } from '../approvals/footer-controls/footer-controls';
import { CreateForm, SolicitudData } from './create-form/create-form';
import { RequestSuccessModal, SuccessModalData, EstadoSolicitud } from './request-success-modal/request-success-modal';
import { Usuario } from '../../interfaces/common.interfaces';
import { UserService } from '../../services/user.service';
import { TypologyService, Typology } from '../../services/typology.service';
import { ApprovalService } from '../../services/approval.service';
import { Observable, of, Subscription } from 'rxjs';
import { Approval } from '../approvals/approvals';
import { AuthService } from '../../services/auth.service';

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
    RequestSuccessModal
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

  constructor(
    private userService: UserService,
    private typologyService: TypologyService,
    private approvalService: ApprovalService,
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
    this.loadTypologies();
    this.loadUsers();
    this.subscribeToApprovals();
  }

  ngOnDestroy(): void {
    this.approvalsSubscription?.unsubscribe();
  }

  subscribeToApprovals(): void {
    if (!this.currentUser) return;
    this.approvalsSubscription = this.approvalService.getApprovalsByCreator(this.currentUser.noUsuario)
      .subscribe(approvals => {
        this.approvalsList = approvals;
        this.applyViewLogic();
        this.isLoading = false;
      });
  }

  loadTypologies(): void {
    this.typologyService.getAll().subscribe(data => {
      this.tipologias = data;
      this.applyViewLogic();
    });
  }

  loadUsers(): void {
    this.userService.obtenerUsuarios().subscribe(data => {
      this.allUsers = data;
      this.applyViewLogic();
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
      .map(d => {
        const found = this.allUsers.find(u => u.usuario === d.usuarioId)?.noUsuario;
        if (typeof found === 'number') return found;
        // Si viene un número en usuarioId, úsalo
        const maybeNum = Number(d.usuarioId);
        return Number.isFinite(maybeNum) && maybeNum > 0 ? maybeNum : undefined as any;
      })
      .filter((id): id is number => typeof id === 'number' && Number.isFinite(id));

    if (destinatariosIds.length === 0) {
      console.error('[CreateRequest] Error: no se pudieron resolver destinatarios a IDs numéricos');
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
        // Asegurar usuarios cargados para el mapeo
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
  }

  handleCancelRequest(event: { solicitudId: string | number }): void {
    const uid = this.currentUser?.noUsuario;
    if (!uid) return;
    this.approvalService.cancelarSolicitud(event.solicitudId, uid).subscribe(() => {
      this.closeDetailModal();
      // refrescar listados del creador
      this.subscribeToApprovals();
    });
  }

  handleDeleteRequest(solicitudId: string | number): void {
    this.approvalService.deleteApproval(solicitudId);
  }

  onManage(id: string): void {
    const uid = this.currentUser?.noUsuario;
    this.isLoadingDetails = true;
    this.approvalService.getApprovalDetails(id, uid).pipe()
      .subscribe(request => {
        if (request && request.fullData) {
          this.successModalData = request.fullData;
          this.isDetailModalVisible = true;
        }
        this.isLoadingDetails = false;
      });
  }

  applyViewLogic(): void {
    const getTypologyDescription = (typeId: string): string => {
      const typology = this.tipologias.find(t => t.idTipologia.toString() === typeId);
      return typology ? typology.descripcion : typeId;
    };
    const getUserFullName = (username: string): string => {
      const user = this.allUsers.find(u => u.usuario === username);
      return user ? `${user.nombres} ${user.apellidos}` : username;
    };
    
    let result: Approval[] = [...this.approvalsList];
    
    if (this.showOnlyManaged) {
        result = result.filter(req => ['APROBADO', 'RECHAZADO', 'CANCELADA'].includes(req.status));
    } else {
        result = result.filter(req => req.status === 'PENDIENTE');
    }

    if (this.searchTerm) {
      const search = this.searchTerm.toLowerCase();
      result = result.filter(req =>
        getTypologyDescription(req.type).toLowerCase().includes(search) ||
        getUserFullName(req.creatorUser).toLowerCase().includes(search) ||
        req.id.toLowerCase().includes(search)
      );
    }

    this.filteredRequests = result;
    this.totalFiltered = this.filteredRequests.length;

    this.filteredRequests.sort((a, b) => {
      const valueA = (a as any)[this.currentOrder];
      const valueB = (b as any)[this.currentOrder];
      if (valueA < valueB) return this.ascendingOrder ? -1 : 1;
      if (valueA > valueB) return this.ascendingOrder ? 1 : -1;
      return 0;
    });

    const start = (this.currentPage - 1) * this.itemsPerPage;
    const page = this.filteredRequests.slice(start, start + this.itemsPerPage);

    this.displayedRequests = page.map(req => ({
      ...req,
      type: getTypologyDescription(req.type),
      creatorUser: getUserFullName(req.creatorUser)
    }));
  }

  onToggleManaged(value: boolean): void { this.showOnlyManaged = value; this.currentPage = 1; this.applyViewLogic(); }
  onQuantityChange(quantity: number): void { this.itemsPerPage = Number(quantity); this.currentPage = 1; this.applyViewLogic(); }
  onSearchChange(term: string): void { this.searchTerm = term; this.currentPage = 1; this.applyViewLogic(); }
  onChangePage(newPage: number): void { this.currentPage = newPage; this.applyViewLogic(); }
  sortBy(field: string): void { if (this.currentOrder === field) { this.ascendingOrder = !this.ascendingOrder; } else { this.currentOrder = field; this.ascendingOrder = true; } this.applyViewLogic(); }
}
