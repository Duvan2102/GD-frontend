import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { Controls } from '../approvals/controls/controls';
import { RequestsTable } from '../approvals/requests-table/requests-table';
import { FooterControls } from '../approvals/footer-controls/footer-controls';
import { CreateForm, SolicitudData } from './create-form/create-form';
import { RequestSuccessModal, SuccessModalData } from './request-success-modal/request-success-modal';
import { Usuario } from '../../interfaces/common.interfaces';
import { UserService } from '../../services/user.service';
import { TypologyService, Typology } from '../../services/typology.service';
import { ApprovalService } from '../../services/approval.service';
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
      console.log('[CreateRequest] Usuario actual cargado:', user);
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
    console.log('[CreateRequest] Destinatarios recibidos:', solicitudData.destinatarios);
    
    const destinatariosIds: number[] = solicitudData.destinatarios
      .filter(d => d.noUsuarioId && d.noUsuarioId > 0)
      .map(d => d.noUsuarioId as number);

    console.log('[CreateRequest] Destinatarios IDs extraídos:', destinatariosIds);

    if (destinatariosIds.length === 0) {
      console.error('[CreateRequest] Error: no se pudieron resolver destinatarios a IDs numéricos');
      console.error('[CreateRequest] Destinatarios originales:', solicitudData.destinatarios);
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

  handleCancelRequest(event: { solicitudId: string | number, comentario?: string }): void {
    const uid = this.currentUser?.noUsuario;
    if (!uid) return;
    this.approvalService.cancelarSolicitud(event.solicitudId, uid, event.comentario).subscribe({
      next: () => {
        // Cerrar la modal de gestión después del éxito
        this.closeDetailModal();
        this.subscribeToApprovals();
        // Mostrar mensaje de éxito
        alert('Solicitud cancelada exitosamente.');
      },
      error: (error) => {
        console.error('[CreateRequest] Error al cancelar solicitud:', error);
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
      console.error('[CreateRequest] No hay usuario actual para eliminar solicitud');
      return;
    }
    
    this.approvalService.deleteApproval(solicitudId, uid).subscribe({
      next: () => {
        console.log('[CreateRequest] Solicitud eliminada exitosamente');
        this.subscribeToApprovals(); // Recargar la lista
      },
      error: (error) => {
        console.error('[CreateRequest] Error al eliminar solicitud:', error);
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
          this.successModalData = this.approvalService.mapToSuccessData(request.fullData, this.allUsers);
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