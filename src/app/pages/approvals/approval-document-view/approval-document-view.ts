import { Component, Input, Output, EventEmitter, OnChanges, SimpleChanges, ChangeDetectorRef, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NgxExtendedPdfViewerModule, PdfLoadedEvent, NgxExtendedPdfViewerService, PagesLoadedEvent } from 'ngx-extended-pdf-viewer';
import { PdfService } from '../../../services/pdf.service';
import { ApprovalService } from '../../../services/approval.service';
import { ConfirmationModal, ConfirmationModalData } from '../../../shared/confirmation-modal/confirmation-modal';

export interface ApprovalDocumentViewData {
  id: string | number;
  file?: File;
  url?: string;
  title?: string;
  fileName?: string;
}

@Component({
  selector: 'app-approval-document-view',
  standalone: true,
  imports: [CommonModule, FormsModule, NgxExtendedPdfViewerModule, ConfirmationModal],
  templateUrl: './approval-document-view.html',
  styleUrls: ['./approval-document-view.css']
})
export class ApprovalDocumentView implements OnChanges, OnDestroy {
  @Input() isVisible = false;
  @Input() documentData: ApprovalDocumentViewData | null = null;
  @Output() close = new EventEmitter<void>();
  @Output() approve = new EventEmitter<{ id: string | number, comentario?: string }>();
  @Output() reject = new EventEmitter<{ id: string | number, comentario?: string }>();
  
  @Output() download = new EventEmitter<ApprovalDocumentViewData>();
  @Output() print = new EventEmitter<ApprovalDocumentViewData>();
  @Output() back = new EventEmitter<void>();

  pdfSrc: string | ArrayBuffer | null = null;
  isLoading = true;
  error = '';
  isScrolledToEnd = false;
  currentPage = 1;
  totalPages = 1;
  zoom = 100;
  comentario: string = '';

  // Confirmation modal properties
  isConfirmationModalVisible = false;
  confirmationModalData: ConfirmationModalData | null = null;
  pendingAction: 'approve' | 'reject' | null = null;

  private scrollListener?: (event: Event) => void;

  constructor(
    private cdr: ChangeDetectorRef,
    private pdfViewerService: NgxExtendedPdfViewerService,
    private pdfService: PdfService,
    private approvalService: ApprovalService
  ) {}

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['isVisible'] && this.isVisible) {
      this.isScrolledToEnd = false;
      this.currentPage = 1;
      this.zoom = 100; 
      this.loadDocument();
    }
  }

  ngOnDestroy(): void {
    this.removeScrollListener();
  }

  async loadDocument() {
    this.isLoading = true;
    this.error = '';
    this.pdfSrc = null;

    if (!this.documentData) {
      this.isLoading = false;
      this.error = 'No se proporcionaron datos del documento.';
      return;
    }

    try {
      if (this.documentData.file) {
        this.pdfSrc = await this.pdfService.fileToArrayBuffer(this.documentData.file);
      } else if (this.documentData.url) {
        this.pdfSrc = this.documentData.url;
      } else {
        this.error = 'No hay un archivo o URL para mostrar.';
      }
    } catch (e) {
      this.error = 'Error al cargar el documento.';
    } finally {
      this.isLoading = false;
      this.cdr.detectChanges();
    }
  }

  onPdfLoaded(event: PdfLoadedEvent): void {
    setTimeout(() => {
      this.setupScrollListener();
    }, 1000);
  }
  
  onPagesLoaded(event: PagesLoadedEvent): void {
    this.totalPages = event.pagesCount;
  }


  private setupScrollListener(): void {
    this.removeScrollListener();
    
    const scrollContainer = (window as any).PDFViewerApplication?.pdfViewer?.container ||
                           (window as any).PDFViewerApplication?.pdfViewer?.viewer;

    if (scrollContainer) {
      this.scrollListener = this.onScroll.bind(this);
      scrollContainer.addEventListener('scroll', this.scrollListener);
    } else {
      setTimeout(() => {
        const container = document.querySelector('#viewerContainer') || 
                         document.querySelector('.pdfViewer');
        if (container) {
          this.scrollListener = this.onScroll.bind(this);
          container.addEventListener('scroll', this.scrollListener);
        }
      }, 500);
    }
  }

  private removeScrollListener(): void {
    if (this.scrollListener) {
      const containers = [
        (window as any).PDFViewerApplication?.pdfViewer?.container,
        (window as any).PDFViewerApplication?.pdfViewer?.viewer,
        document.querySelector('#viewerContainer'),
        document.querySelector('.pdfViewer')
      ].filter(Boolean);

      containers.forEach(container => {
        if (container && container.removeEventListener) {
          container.removeEventListener('scroll', this.scrollListener);
        }
      });
      
      this.scrollListener = undefined;
    }
  }

  onScroll(event: Event): void {
    const target = event.target as HTMLElement;
    if (target.scrollHeight - target.scrollTop <= target.clientHeight + 10) {
      if (!this.isScrolledToEnd) {
        this.isScrolledToEnd = true;
        this.cdr.detectChanges();
      }
    }
  }

  onClose() { 
    this.close.emit(); 
  }

  onApprove() {
    if (!this.documentData) return;
    
    this.pendingAction = 'approve';
    this.confirmationModalData = {
      title: 'Aprobar Solicitud',
      message: '¿Está seguro de que desea aprobar esta solicitud? Esta acción no se puede deshacer.',
      confirmText: 'Sí, Aprobar',
      cancelText: 'Cancelar',
      type: 'success',
      showComment: true,
      commentLabel: 'Comentario (obligatorio)',
      commentPlaceholder: 'Escriba un comentario para la aprobación...',
      commentRequired: true
    };
    
    this.isConfirmationModalVisible = true;
  }

  onReject() {
    if (!this.documentData) return;
    
    this.pendingAction = 'reject';
    this.confirmationModalData = {
      title: 'Rechazar Solicitud',
      message: '¿Está seguro de que desea rechazar esta solicitud? Esta acción no se puede deshacer.',
      confirmText: 'Sí, Rechazar',
      cancelText: 'Cancelar',
      type: 'danger',
      showComment: true,
      commentLabel: 'Motivo del rechazo (obligatorio)',
      commentPlaceholder: 'Escriba el motivo del rechazo...',
      commentRequired: true
    };
    
    this.isConfirmationModalVisible = true;
  }

  onConfirmationModalConfirm(event: { confirmed: boolean, comment?: string }): void {
    this.isConfirmationModalVisible = false;
    
    if (event.confirmed && this.documentData && this.pendingAction) {
      const comentario = event.comment?.trim() || '';
      
      // Registrar metadata de la acción
      this.recordActionMetadata(this.pendingAction, comentario);
      
      if (this.pendingAction === 'approve') {
        this.approve.emit({ id: this.documentData.id, comentario: comentario });
      } else if (this.pendingAction === 'reject') {
        this.reject.emit({ id: this.documentData.id, comentario: comentario });
      }
    }
    
    this.pendingAction = null;
  }

  onConfirmationModalCancel(): void {
    this.isConfirmationModalVisible = false;
    this.pendingAction = null;
  }

  private recordActionMetadata(action: 'approve' | 'reject', comentario?: string): void {
    if (!this.documentData?.id) return;
    
    // Obtener el ID del usuario actual (esto debería venir del auth service)
    const currentUserId = 'current-user-id'; // TODO: Obtener del AuthService
    
    this.approvalService.recordApprovalAction(
      String(this.documentData.id),
      currentUserId,
      action,
      comentario
    ).subscribe({
      next: (metadata) => {
        console.log('[ApprovalDocumentView] Metadata registrada:', metadata);
      },
      error: (error) => {
        console.error('[ApprovalDocumentView] Error registrando metadata:', error);
      }
    });
  }

  onBack() {
    this.back.emit();
  }

  onDownload(): void {
    if (!this.pdfSrc) return;
    const filename = this.pdfService.getFileName(this.documentData);
    this.pdfService.createDownloadBlob(this.pdfSrc, filename);
  }

  onPrint(): void {
    this.pdfViewerService.print();
  }

  onPreviousPage() { if (this.currentPage > 1) this.currentPage--; }
  onNextPage() { if (this.currentPage < this.totalPages) this.currentPage++; }
  onZoomIn() { this.zoom += 25; }
  onZoomOut() { if (this.zoom > 25) this.zoom -= 25; }
  onZoomReset() { this.zoom = 100; }

  getFileName(): string {
    return this.pdfService.getFileName(this.documentData);
  }
}

