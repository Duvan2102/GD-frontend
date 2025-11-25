import { Component, Input, Output, EventEmitter, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';

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
  selector: 'app-requests-table',
  standalone: true,
  imports: [
    CommonModule
  ],
  templateUrl: './requests-table.html',
  styleUrls: ['./requests-table.css']
})
export class RequestsTable {
  @Input() requests: Approval[] = [];
  @Input() totalItems: number = 0;
  @Input() currentOrder: string = '';
  @Input() ascendingOrder: boolean = true;
  @Input() currentPage: number = 1;
  @Input() itemsPerPage: number = 10;
  @Input() detailedView: boolean = false;
  @Input() isToggleActive: boolean = false;
  @Input() viewType: 'approvals' | 'approval-process' | 'create-request' | 'approval-details' = 'approvals';

  @ViewChild('tooltipElement') tooltipElement!: ElementRef;

  @Output() sort = new EventEmitter<string>();
  @Output() manage = new EventEmitter<string>();
  @Output() changePage = new EventEmitter<number>();

  // Propiedades para el tooltip personalizado
  tooltipVisible = false;
  tooltipText = '';
  tooltipX = 0;
  tooltipY = 0;

  getSortIcon(field: string): any {
    if (this.currentOrder !== field) return { 'bi-arrow-down-up': true, 'text-muted': true };
    return this.ascendingOrder ? { 'bi-arrow-down': true } : { 'bi-arrow-up': true };
  }

  getRemainingApproversNames(approvers: { initials: string; fullName: string }[]): string {
    if (approvers.length <= 4) return '';
    const remaining = approvers.slice(4);
    return remaining.map(a => a.fullName).join(', ');
  }

  trackByApprover(index: number, approver: { initials: string; fullName: string }): string {
    return approver.initials + approver.fullName;
  }

  showTooltip(event: MouseEvent, text: string, position: 'top' | 'bottom' = 'top'): void {
    this.tooltipText = text;
    this.tooltipVisible = true;
    
    // Obtener posición del elemento
    const rect = (event.target as HTMLElement).getBoundingClientRect();
    const scrollX = window.pageXOffset || document.documentElement.scrollLeft;
    const scrollY = window.pageYOffset || document.documentElement.scrollTop;
    
    // Calcular posición del tooltip
    const tooltipWidth = 200; // Ancho estimado del tooltip
    const tooltipHeight = 30; // Alto estimado del tooltip
    const offset = 10; // Distancia del elemento
    
    // Centrar horizontalmente
    this.tooltipX = rect.left + scrollX + (rect.width / 2) - (tooltipWidth / 2);
    
    // Posicionar arriba o abajo según la posición disponible
    if (position === 'top') {
      this.tooltipY = rect.top + scrollY - tooltipHeight - offset;
      
      // Si no hay espacio arriba, mostrar abajo
      if (this.tooltipY < scrollY) {
        this.tooltipY = rect.bottom + scrollY + offset;
      }
    } else {
      this.tooltipY = rect.bottom + scrollY + offset;
      
      // Si no hay espacio abajo, mostrar arriba
      if (this.tooltipY + tooltipHeight > scrollY + window.innerHeight) {
        this.tooltipY = rect.top + scrollY - tooltipHeight - offset;
      }
    }
    
    // Asegurar que el tooltip no se salga de la pantalla horizontalmente
    if (this.tooltipX < 10) {
      this.tooltipX = 10;
    } else if (this.tooltipX + tooltipWidth > window.innerWidth - 10) {
      this.tooltipX = window.innerWidth - tooltipWidth - 10;
    }
  }

  hideTooltip(): void {
    this.tooltipVisible = false;
  }
}