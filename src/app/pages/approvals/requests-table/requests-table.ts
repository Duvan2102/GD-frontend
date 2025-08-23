import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';

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
  @Input() requests: any[] = [];
  @Input() totalItems: number = 0;
  @Input() currentOrder: string = '';
  @Input() ascendingOrder: boolean = true;
  @Input() currentPage: number = 1;
  @Input() itemsPerPage: number = 10;
  @Input() detailedView: boolean = false;
  @Input() isToggleActive: boolean = false;
  @Input() viewType: 'approvals' | 'create-request' | 'approval-details' = 'approvals';


  @Output() sort = new EventEmitter<string>();
  @Output() manage = new EventEmitter<string>();
  @Output() changePage = new EventEmitter<number>();

  getSortIcon(field: string): any {
    if (this.currentOrder !== field) return { 'bi-arrow-down-up': true, 'text-muted': true };
    return this.ascendingOrder ? { 'bi-arrow-down': true } : { 'bi-arrow-up': true };
  }
}