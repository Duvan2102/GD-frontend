import { Component, Input, Output, EventEmitter, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

export interface ConfirmationModalData {
  title: string;
  message: string;
  confirmText: string;
  cancelText: string;
  type: 'warning' | 'danger' | 'info' | 'success';
  showComment?: boolean;
  commentLabel?: string;
  commentPlaceholder?: string;
  commentRequired?: boolean;
}

@Component({
  selector: 'app-confirmation-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './confirmation-modal.html',
  styleUrls: ['./confirmation-modal.css']
})
export class ConfirmationModal {
  @Input() isVisible = false;
  @Input() data: ConfirmationModalData | null = null;
  
  @Output() confirm = new EventEmitter<{ confirmed: boolean, comment?: string }>();
  @Output() cancel = new EventEmitter<void>();

  comment: string = '';
  commentTouched: boolean = false;

  getIconClass(): string {
    if (!this.data) return 'bi-question-circle';
    
    switch (this.data.type) {
      case 'warning': return 'bi-exclamation-triangle';
      case 'danger': return 'bi-x-circle';
      case 'info': return 'bi-info-circle';
      case 'success': return 'bi-check-circle';
      default: return 'bi-question-circle';
    }
  }

  getModalClass(): string {
    if (!this.data) return '';
    
    switch (this.data.type) {
      case 'warning': return 'modal-warning';
      case 'danger': return 'modal-danger';
      case 'info': return 'modal-info';
      case 'success': return 'modal-success';
      default: return '';
    }
  }

  getButtonClass(): string {
    if (!this.data) return 'btn-primary';
    
    switch (this.data.type) {
      case 'warning': return 'btn-warning';
      case 'danger': return 'btn-danger';
      case 'info': return 'btn-info';
      case 'success': return 'btn-success';
      default: return 'btn-primary';
    }
  }

  onConfirm(): void {
    if (this.data?.showComment && this.data.commentRequired && !this.comment.trim()) {
      this.commentTouched = true; 
      return;
    }
    
    this.confirm.emit({ 
      confirmed: true, 
      comment: this.data?.showComment ? this.comment.trim() : undefined 
    });
    this.resetForm();
  }

  onCancel(): void {
    this.cancel.emit();
    this.resetForm();
  }

  private resetForm(): void {
    this.comment = '';
    this.commentTouched = false;
  }

  onCommentFocus(): void {
    this.commentTouched = true;
  }

  onCommentBlur(): void {
    this.commentTouched = true;
  }

  canConfirm(): boolean {
    if (!this.data) return false;
    
    if (this.data.showComment && this.data.commentRequired) {
      return this.comment.trim().length > 0;
    }
    
    return true;
  }

  @HostListener('document:keydown.escape', ['$event'])
  onEscapeKey(event: Event): void {
    if (this.isVisible) {
      this.onCancel();
    }
  }

  @HostListener('document:keydown.enter', ['$event'])
  onEnterKey(event: Event): void {
    const keyboardEvent = event as KeyboardEvent;
    if (this.isVisible && this.canConfirm() && !keyboardEvent.shiftKey) {
      event.preventDefault();
      this.onConfirm();
    }
  }
}
