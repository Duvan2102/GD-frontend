import { Component, Input, Output, EventEmitter, OnChanges, SimpleChanges, ChangeDetectorRef, OnDestroy, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NgxExtendedPdfViewerModule, PdfLoadedEvent, NgxExtendedPdfViewerService, PagesLoadedEvent, NgxExtendedPdfViewerComponent } from 'ngx-extended-pdf-viewer';
import { PdfService } from '../../../services/pdf.service';
import { ApprovalService } from '../../../services/approval.service';
import { AuthService } from '../../../services/auth.service';
import { ConfirmationModal, ConfirmationModalData } from '../confirmation-modal/confirmation-modal';
import { AuthApprovalModal } from '../../../components/auth-approvals/auth-approval-modal';

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
  imports: [CommonModule, FormsModule, NgxExtendedPdfViewerModule, ConfirmationModal, AuthApprovalModal],
  templateUrl: './approval-document-view.html',
  styleUrls: ['./approval-document-view.css']
})
export class ApprovalDocumentView implements OnChanges, OnDestroy {
  @Input() isVisible = false;
  @Input() documentData: ApprovalDocumentViewData | null = null;
  @Output() close = new EventEmitter<void>();
  @Output() approve = new EventEmitter<{ id: string | number, comentario?: string }>();
  @Output() reject = new EventEmitter<{ id: string | number, comentario?: string }>();
  
  @Output() print = new EventEmitter<ApprovalDocumentViewData>();
  @Output() back = new EventEmitter<void>();

  @ViewChild('pdfViewer') pdfViewer?: NgxExtendedPdfViewerComponent;

  pdfSrc: string | ArrayBuffer | null = null;
  isLoading = true;
  error = '';
  isScrolledToEnd = false;
  currentPage = 1;
  totalPages = 1;
  zoom = 100;
  comentario: string = '';
  private isPdfReady = false;
  private scrollCheckInterval: any;

  // Confirmation modal properties
  isConfirmationModalVisible = false;
  confirmationModalData: ConfirmationModalData | null = null;
  pendingAction: 'approve' | 'reject' | null = null;
  
  // Auth approval modal properties
  isAuthApprovalModalVisible = false;
  pendingComment: string = '';


  constructor(
    private cdr: ChangeDetectorRef,
    private pdfViewerService: NgxExtendedPdfViewerService,
    private pdfService: PdfService,
    private approvalService: ApprovalService,
    private authService: AuthService
  ) {}

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['isVisible']) {
      if (this.isVisible) {
        this.isScrolledToEnd = false;
        this.currentPage = 1;
        this.zoom = 100; 
        this.loadDocument();
      } else {
        // Limpiar cuando se oculta el modal
        this.stopScrollCheck();
      }
    }
  }

  ngOnDestroy(): void {
    this.stopScrollCheck();
    this.detachScrollListeners();
  }

  async loadDocument() {
    this.isLoading = true;
    this.error = '';
    this.pdfSrc = null;
    this.isPdfReady = false;
    this.isScrolledToEnd = false;
    this.stopScrollCheck();

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

  onAfterLoadComplete(event: PdfLoadedEvent): void {
    this.isPdfReady = true;
    this.syncViewerPage();
    // Iniciar verificación de scroll después de que el PDF esté cargado
    setTimeout(() => {
      this.startScrollCheck();
      this.attachScrollListeners();
    }, 500);
  }

  onPagesLoaded(event: PagesLoadedEvent): void {
    this.totalPages = event.pagesCount;
    
    // Iniciar verificación de scroll después de cargar las páginas
    setTimeout(() => {
      this.startScrollCheck();
    }, 1000);
  }

  public onPageChange(page: number): void {
    this.currentPage = page;
    
    // Verificar si llegó a la última página
    this.checkIfScrolledToEnd();
    
    // Si llegó a la última página, dar un tiempo para que el usuario vea la página
    // y luego habilitar automáticamente (estrategia de respaldo)
    if (page >= this.totalPages && !this.isScrolledToEnd) {
      setTimeout(() => {
        if (!this.isScrolledToEnd && this.currentPage >= this.totalPages) {
          this.isScrolledToEnd = true;
          this.stopScrollCheck();
          this.cdr.detectChanges();
        }
      }, 3000); // 3 segundos después de llegar a la última página
    }
  }

  private syncViewerPage(): void {
    if (this.isPdfReady && this.pdfViewer) {
      this.pdfViewer.page = this.currentPage;
    }
  }

  private goToPage(page: number): void {
    this.currentPage = page;
    this.syncViewerPage();
  }


  onClose() { 
    this.isPdfReady = false;
    this.stopScrollCheck();
    this.detachScrollListeners();
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
      this.pendingComment = comentario;
      
      // Mostrar la modal de validación de identidad
      this.isAuthApprovalModalVisible = true;
    } else {
      this.pendingAction = null;
    }
  }

  onConfirmationModalCancel(): void {
    this.isConfirmationModalVisible = false;
    this.pendingAction = null;
  }

  onAuthApprovalValidate(event: { token: string, action: 'approve' | 'reject' }): void {
    this.isAuthApprovalModalVisible = false;
    
    if (this.documentData && this.pendingAction) {
      // Registrar metadata de la acción
      this.recordActionMetadata(this.pendingAction, this.pendingComment);
      
      if (this.pendingAction === 'approve') {
        this.approve.emit({ id: this.documentData.id, comentario: this.pendingComment });
      } else if (this.pendingAction === 'reject') {
        this.reject.emit({ id: this.documentData.id, comentario: this.pendingComment });
      }
    }
    
    this.pendingAction = null;
    this.pendingComment = '';
  }

  onAuthApprovalClose(): void {
    this.isAuthApprovalModalVisible = false;
    this.pendingAction = null;
    this.pendingComment = '';
  }

  onAuthApprovalCancel(): void {
    this.isAuthApprovalModalVisible = false;
    this.pendingAction = null;
    this.pendingComment = '';
  }

  onLogoutRequired(): void {
    this.isAuthApprovalModalVisible = false;
    this.pendingAction = null;
    this.pendingComment = '';
    this.close.emit();
    
    this.authService.logout().subscribe({
      next: () => {
        alert('Su sesión ha expirado. Será redirigido al login automáticamente.');
        setTimeout(() => {
          window.location.href = '/login';
        }, 2000);
      },
      error: () => {
        this.authService.logoutSync();
        alert('Su sesión ha expirado. Será redirigido al login automáticamente.');
        setTimeout(() => {
          window.location.href = '/login';
        }, 2000);
      }
    });
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
      },
      error: (error) => {
      }
    });
  }

  onBack() {
    this.back.emit();
  }


  onPrint(): void {
    this.pdfViewerService.print();
  }

  onPreviousPage() { if (this.currentPage > 1) this.goToPage(this.currentPage - 1); }
  onNextPage() { if (this.currentPage < this.totalPages) this.goToPage(this.currentPage + 1); }
  onZoomIn() { this.zoom += 25; }
  onZoomOut() { if (this.zoom > 25) this.zoom -= 25; }
  onZoomReset() { this.zoom = 100; }

  getFileName(): string {
    return this.pdfService.getFileName(this.documentData);
  }

  /**
   * Inicia la verificación periódica del scroll para detectar cuando el usuario
   * ha llegado al final del documento
   */
  private startScrollCheck(): void {
    this.stopScrollCheck();
    
    // Para documentos de una sola página, habilitar inmediatamente
    if (this.totalPages === 1) {
      this.isScrolledToEnd = true;
      this.cdr.detectChanges();
      return;
    }
    
    // Para documentos multi-página, verificar cada 500ms
    this.scrollCheckInterval = setInterval(() => {
      this.checkIfScrolledToEnd();
    }, 500);
  }

  /**
   * Detiene la verificación periódica del scroll
   */
  private stopScrollCheck(): void {
    if (this.scrollCheckInterval) {
      clearInterval(this.scrollCheckInterval);
      this.scrollCheckInterval = null;
    }
  }

  /**
   * Verifica si el usuario ha llegado al final del documento.
   * Considera dos estrategias:
   * 1. Si está en la última página y ha scrolleado hacia abajo
   * 2. Si ha navegado manualmente a la última página
   */
  private checkIfScrolledToEnd(): void {
    if (this.isScrolledToEnd) {
      return; // Ya está habilitado, no hacer nada más
    }

    // Estrategia 1: Verificar si está en la última página
    if (this.currentPage >= this.totalPages) {
      // Obtener el contenedor de scroll del visor PDF
      const scrollContainer = this.getScrollContainer();
      
      if (scrollContainer) {
        const scrollTop = scrollContainer.scrollTop;
        const scrollHeight = scrollContainer.scrollHeight;
        const clientHeight = scrollContainer.clientHeight;
        
        // Si está cerca del final (dentro de 100px del fondo) o si el contenido no requiere scroll
        const isAtBottom = scrollHeight - scrollTop - clientHeight < 100;
        const noScrollNeeded = scrollHeight <= clientHeight + 10;
        
        if (isAtBottom || noScrollNeeded) {
          this.isScrolledToEnd = true;
          this.stopScrollCheck(); // Detener verificación una vez alcanzado
          this.cdr.detectChanges();
        }
      } else {
        // Si no se puede obtener el contenedor, asumir que está al final si está en la última página
        this.isScrolledToEnd = true;
        this.stopScrollCheck();
        this.cdr.detectChanges();
      }
    }
  }

  /**
   * Obtiene el contenedor de scroll del visor PDF
   * Intenta múltiples selectores para compatibilidad
   */
  private getScrollContainer(): HTMLElement | null {
    // Intentar obtener el contenedor de diferentes formas
    const selectors = [
      '#viewerContainer',
      '.ng2-pdf-viewer-container',
      '.pdfViewer',
      '[class*="viewerContainer"]',
      'ngx-extended-pdf-viewer'
    ];
    
    for (const selector of selectors) {
      const element = document.querySelector(selector) as HTMLElement;
      if (element) {
        return element;
      }
    }
    
    // Intentar a través de la API de ngx-extended-pdf-viewer
    const pdfApp = (window as any).PDFViewerApplication;
    if (pdfApp?.pdfViewer?.container) {
      return pdfApp.pdfViewer.container;
    }
    
    return null;
  }

  /**
   * Adjunta listeners de scroll para detectar cuando el usuario scrollea
   */
  private attachScrollListeners(): void {
    // Buscar y adjuntar listener al contenedor después de un delay
    setTimeout(() => {
      const container = this.getScrollContainer();
      if (container) {
        container.addEventListener('scroll', this.handleScroll.bind(this));
      }
      
      // También escuchar eventos de scroll en window por si acaso
      window.addEventListener('scroll', this.handleScroll.bind(this), true);
    }, 1000);
  }

  /**
   * Remueve los listeners de scroll
   */
  private detachScrollListeners(): void {
    const container = this.getScrollContainer();
    if (container) {
      container.removeEventListener('scroll', this.handleScroll.bind(this));
    }
    window.removeEventListener('scroll', this.handleScroll.bind(this), true);
  }

  /**
   * Maneja eventos de scroll
   */
  private handleScroll(): void {
    if (!this.isScrolledToEnd) {
      this.checkIfScrolledToEnd();
    }
  }
}

