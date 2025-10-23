import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { Subscription } from 'rxjs';

import { Controls } from '../approvals/controls/controls';
import { FooterControls } from '../approvals/footer-controls/footer-controls';
import { ApprovalService } from '../../services/approval.service';
import { UserService } from '../../services/user.service';
import { AuthService } from '../../services/auth.service';
import { TypologyService } from '../../services/typology.service';
import { Usuario, UsuarioData } from '../../interfaces/common.interfaces';
import { Approval } from '../approvals/approvals';

interface ReportItem {
  id: string;
  tipoSolicitud: string;
  codificacion: string;
  fechaCreacion: Date;
  usuarioCreador: string;
  area: string;
  departamento: string;
  ultimaActualizacion: Date;
  estado: string;
  selected?: boolean;
}

type SortField = keyof Omit<ReportItem, 'selected'>;

@Component({
  selector: 'app-reports-audits',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    Controls,
    FooterControls
  ],
  templateUrl: './reports-audits.html',
  styleUrls: ['./reports-audits.css']
})
export class ReportsAudits implements OnInit, OnDestroy {
  allItems: ReportItem[] = [];
  allUsers: Usuario[] = [];
  allTypologies: any[] = [];
  currentUser: UsuarioData | null = null;
  isLoading = false;
  private subscriptions: Subscription[] = [];
  displayedItems: ReportItem[] = [];
  private filteredItems: ReportItem[] = [];

  totalFiltered = 0;
  searchTerm = '';
  showOnlyApproved = false;
  currentPage = 1;
  itemsPerPage = 10;
  currentOrder: SortField = 'fechaCreacion';
  ascendingOrder = false;

  constructor(
    private approvalService: ApprovalService,
    private userService: UserService,
    private authService: AuthService,
    private typologyService: TypologyService
  ) {}

  ngOnInit(): void {
    this.loadData();
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach(sub => sub.unsubscribe());
  }

  private loadData(): void {
    this.isLoading = true;
    const userSub = this.authService.getCurrentUser().subscribe({
      next: (user) => {
        this.currentUser = user;
        if (user) {
          this.loadUsersTypologiesAndApprovals(user);
        }
      },
      error: () => {
        this.isLoading = false;
      }
    });
    
    this.subscriptions.push(userSub);
  }

  private loadUsersTypologiesAndApprovals(user: UsuarioData): void {
    const usersSub = this.userService.obtenerUsuarios().subscribe({
      next: (users) => {
        this.allUsers = users;
        this.loadTypologiesAndApprovals(user);
      },
      error: () => {
        this.loadTypologiesAndApprovals(user);
      }
    });
    
    this.subscriptions.push(usersSub);
  }

  private loadTypologiesAndApprovals(user: UsuarioData): void {
    const typologySub = this.typologyService.getAll().subscribe({
      next: (typologies: any[]) => {
        this.allTypologies = typologies;
        this.loadApprovals(user);
      },
      error: () => {
        this.loadApprovals(user);
      }
    });
    
    this.subscriptions.push(typologySub);
  }

  private loadApprovals(user: UsuarioData): void {
    const approvalsSub = this.approvalService.getApprovalsByArea(
      user.idUsuario,
      this.allUsers,
      0,
      1000
    ).subscribe({
      next: (approvals) => {
        this.allItems = approvals.map(approval => this.mapApprovalToReportItem(approval));
        this.isLoading = false;
        this.applyViewLogic();
      },
      error: () => {
        this.isLoading = false;
        this.applyViewLogic();
      }
    });
    
    this.subscriptions.push(approvalsSub);
  }

  private mapApprovalToReportItem(approval: Approval): ReportItem {
    const tipologia = this.allTypologies.find(t => t.idTipologia?.toString() === approval.type);
    const tipoSolicitud = tipologia?.descripcion || approval.type || 'SOLICITUD';
    const creador = this.allUsers.find(u => 
      u.usuario === approval.creatorUser || 
      u.idUsuario?.toString() === approval._creadorId?.toString()
    );
    
    const area = creador?.cargo?.area?.descripcion || approval.position || 'N/A';
    const departamento = creador?.cargo?.area?.departamento?.descripcion || 'N/A';
    
    return {
      id: approval.id,
      tipoSolicitud: tipoSolicitud,
      codificacion: approval.id,
      fechaCreacion: new Date(approval.creationDate),
      usuarioCreador: approval.creatorUser || approval.creatorFullName,
      area: area,
      departamento: departamento,
      ultimaActualizacion: new Date(approval.lastUpdate),
      estado: approval.status,
      selected: false
    };
  }

  applyViewLogic(): void {
    let result = [...this.allItems];
    if (this.showOnlyApproved) {
      result = result.filter(item => item.estado === 'APROBADO');
    }

    if (this.searchTerm) {
      const term = this.searchTerm.toLowerCase();
      result = result.filter(item =>
        item.tipoSolicitud.toLowerCase().includes(term) ||
        item.usuarioCreador.toLowerCase().includes(term) ||
        item.id.toLowerCase().includes(term)
      );
    }

    this.filteredItems = result;
    this.totalFiltered = this.filteredItems.length;

    this.filteredItems.sort((a, b) => {
      const aVal = a[this.currentOrder];
      const bVal = b[this.currentOrder];
      if (aVal < bVal) {
        return this.ascendingOrder ? -1 : 1;
      }
      if (aVal > bVal) {
        return this.ascendingOrder ? 1 : -1;
      }
      return 0;
    });

    const start = (this.currentPage - 1) * this.itemsPerPage;
    this.displayedItems = this.filteredItems.slice(start, start + this.itemsPerPage);
  }

  onToggleApproved(value: boolean): void {
    this.showOnlyApproved = value;
    this.currentPage = 1;
    this.applyViewLogic();
  }

  onQuantityChange(quantity: number): void {
    this.itemsPerPage = quantity;
    this.currentPage = 1;
    this.applyViewLogic();
  }

  onSearchChange(term: string): void {
    this.searchTerm = term;
    this.currentPage = 1;
    this.applyViewLogic();
  }

  onChangePage(page: number): void {
    this.currentPage = page;
    this.applyViewLogic();
  }

  sortBy(field: SortField): void {
    if (this.currentOrder === field) {
      this.ascendingOrder = !this.ascendingOrder;
    } else {
      this.currentOrder = field;
      this.ascendingOrder = true;
    }
    this.applyViewLogic();
  }

  toggleAll(event: Event): void {
    const checked = (event.target as HTMLInputElement).checked;
    this.displayedItems.forEach(item => item.selected = checked);
  }

  onManage(id: string): void {}
}
