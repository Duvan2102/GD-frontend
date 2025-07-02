import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-footer-controls',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './footer-controls.html',
  styleUrls: ['./footer-controls.css'], 
})
export class FooterControls {
  
  @Input() totalItems!: number;
  @Input() itemsPerPage!: number;
  @Input() currentPage!: number;

  @Output() changePage = new EventEmitter<number>();

  showDropdown = false;
  timeoutId: any = null;

  get totalPages(): number {
    if (!this.totalItems || !this.itemsPerPage) return 1;
    return Math.ceil(this.totalItems / this.itemsPerPage);
  }

  get allPages(): number[] {
    return Array.from({ length: this.totalPages }, (_, i) => i + 1);
  }

  get startRecord(): number {
    if (this.totalItems === 0) return 0;
    return (this.currentPage - 1) * this.itemsPerPage + 1;
  }

  get endRecord(): number {
    const end = this.currentPage * this.itemsPerPage;
    return end > this.totalItems ? this.totalItems : end;
  }

  changeToPage(page: number): void {
    if (page >= 1 && page <= this.totalPages && page !== this.currentPage) {
      this.changePage.emit(page);
    }
  }

  selectPage(page: number): void {
    this.showDropdown = false;
    this.changeToPage(page);
  }

  hideDropdownWithDelay(): void {
    this.timeoutId = setTimeout(() => {
      this.showDropdown = false;
    }, 300);
  }

  cancelHideDropdown(): void {
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
      this.timeoutId = null;
    }
  }
}