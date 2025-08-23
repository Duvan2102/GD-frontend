import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { Controls } from '../approvals/controls/controls';
import { RequestsTable } from '../approvals/requests-table/requests-table';
import { FooterControls } from '../approvals/footer-controls/footer-controls';
import { ApprovalService } from '../../services/approval.service';
import { Subscription } from 'rxjs';
import { Approval } from '../approvals/approvals';
import { Typology, TypologyService } from '../../services/typology.service';
import { AuthService } from '../../services/auth.service';

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
  
  displayedRequests: any[] = [];
  private filteredRequests: any[] = [];
  totalFiltered: number = 0;

  searchTerm: string = '';
  showOnlyManaged: boolean = false;
  currentPage: number = 1;
  itemsPerPage: number = 10;
  currentOrder: string = 'creationDate';
  ascendingOrder: boolean = false;

  constructor(
    private approvalService: ApprovalService,
    private typologyService: TypologyService,
    private authService: AuthService
    ) {}

  ngOnInit(): void {
    this.loadTypologies();
    this.subscribeToApprovals();
  }

  ngOnDestroy(): void {
    this.approvalsSubscription?.unsubscribe();
  }

  loadTypologies(): void {
    this.typologyService.getAll().subscribe(data => {
      this.tipologias = data;
    });
  }

  subscribeToApprovals(): void {
    this.approvalsSubscription = this.approvalService.getAllApprovals()
      .subscribe(approvals => {
        this.approvalsList = approvals;
        this.applyViewLogic();
      });
  }

  applyViewLogic(): void {
    const getTypologyDescription = (typeId: string): string => {
      const typology = this.tipologias.find(t => t.idTipologia.toString() === typeId);
      return typology ? typology.descripcion : typeId;
    };

    let result = [...this.approvalsList];
    if (this.showOnlyManaged) {
      result = result.filter(req => req.status === 'RECHAZADO' || req.status === 'CANCELADA');
    } else {
      result = result.filter(req => req.status === 'APROBADO');
    }

    if (this.searchTerm) {
      const search = this.searchTerm.toLowerCase();
      result = result.filter(req =>
        getTypologyDescription(req.type).toLowerCase().includes(search) ||
        req.creatorUser.toLowerCase().includes(search) ||
        req.id.toLowerCase().includes(search)
      );
    }
    this.filteredRequests = result;
    this.totalFiltered = this.filteredRequests.length;

    if (this.currentOrder) {
      this.filteredRequests.sort((a, b) => {
        const valueA = (a as any)[this.currentOrder];
        const valueB = (b as any)[this.currentOrder];
        if (valueA < valueB) return this.ascendingOrder ? -1 : 1;
        if (valueA > valueB) return this.ascendingOrder ? 1 : -1;
        return 0;
      });
    }

    const start = (this.currentPage - 1) * this.itemsPerPage;
    this.displayedRequests = this.filteredRequests.slice(start, start + this.itemsPerPage).map(req => ({
      ...req,
      type: getTypologyDescription(req.type)
    }));
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