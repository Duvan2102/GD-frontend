import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { Controls } from '../approvals/controls/controls';
import { RequestsTable } from '../approvals/requests-table/requests-table';
import { FooterControls } from '../approvals/footer-controls/footer-controls';
import { ApprovalService } from '../../services/approval.service';
import { Subscription, combineLatest } from 'rxjs';
import { Approval } from '../approvals/approvals';
import { Typology, TypologyService } from '../../services/typology.service';
import { AuthService } from '../../services/auth.service';
import { Usuario, UsuarioRequest, ApiResponse, ErrorResponse, DobleAutenticacionTipo } from '../../interfaces/common.interfaces';
import { UserService } from '../../services/user.service';
import { applyApprovalDetailsViewLogic } from '../../utils/view.utils';

@Component({
  selector: 'app-approval-details',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    Controls,
    RequestsTable,
    FooterControls
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

  constructor(
    private approvalService: ApprovalService,
    private typologyService: TypologyService,
    private authService: AuthService,
    private userService: UserService
    ) {}

  ngOnInit(): void {
    this.authService.getCurrentUser().subscribe(u => {
      this.currentUserId = u.noUsuario;
      this.loadInitialData();
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
    this.approvalsSubscription = this.approvalService.getHistorico(this.currentUserId, this.allUsers)
      .subscribe(approvals => {
        this.approvalsList = approvals;
        this.applyViewLogic();
        this.isLoading = false;
      });
  }

  applyViewLogic(): void {
    const { displayedRequests, totalFiltered } = applyApprovalDetailsViewLogic(
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
    console.log('Visualizando detalles para la solicitud con ID:', id);
  }
}