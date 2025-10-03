import { Component, Input, Output, EventEmitter, OnChanges, SimpleChanges, ChangeDetectorRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NgxExtendedPdfViewerModule, NgxExtendedPdfViewerService, NgxExtendedPdfViewerComponent } from 'ngx-extended-pdf-viewer';
import { PdfService } from '../../../services/pdf.service';

export interface DocumentViewData {
  id: string | number;
  file?: File;
  url?: string;
  title?: string;
  fileName?: string;
  metadata?: any;
}

@Component({
  selector: 'app-document-view',
  standalone: true,
  imports: [CommonModule, NgxExtendedPdfViewerModule],
  templateUrl: './document-view.html',
  styleUrls: ['./document-view.css']
})
export class DocumentView implements OnChanges {
  @Input() isVisible = false;
  @Input() documentData: DocumentViewData | null = null;
  @Input() hideManagementButtons = false; // Nuevo input para ocultar botones de gestión
  @Input() hideSendButton = false; // Nuevo input para ocultar botón de envío
  @Input() hidePrintButton = false; // Nuevo input para ocultar botón de imprimir
  @Output() close = new EventEmitter<void>();
  @Output() edit = new EventEmitter<void>();
  @Output() send = new EventEmitter<void>();
  @Output() deleteRequest = new EventEmitter<string | number>();
  @Output() discard = new EventEmitter<void>();

  @ViewChild('pdfViewer') pdfViewer?: NgxExtendedPdfViewerComponent;

  pdfSrc: string | ArrayBuffer | null = null;
  isLoading = true;
  error = '';
  currentPage = 1;
  totalPages = 1;
  zoom = 100;
  private isPdfReady = false;

  constructor(
    private pdfViewerService: NgxExtendedPdfViewerService,
    private pdfService: PdfService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnChanges(changes: SimpleChanges): void {
    // Solo cargar el documento si el modal se está mostrando y hay datos
    if (changes['isVisible'] && this.isVisible && this.documentData) {
      // Wait for DOM to be ready and modal to be fully rendered
      setTimeout(() => {
        this.loadDocument();
      }, 300);
    }
    
    // Si cambian los datos del documento y el modal está visible, recargar
    if (changes['documentData'] && this.documentData && this.isVisible) {
      // Wait for DOM to be ready and modal to be fully rendered
      setTimeout(() => {
        this.loadDocument();
      }, 300);
    }
    
    // Si el modal se oculta, limpiar el estado
    if (changes['isVisible'] && !this.isVisible) {
      this.onClose();
    }
  }

  public onPagesLoaded(event: any): void {
    this.totalPages = event.pagesCount;
  }

  public onAfterLoadComplete(event: any): void {
    this.isPdfReady = true;
    this.totalPages = event.pagesCount || this.totalPages;
    this.syncViewerPage();
  }

  public onPageChange(page: number): void {
    this.currentPage = page;
  }

  private syncViewerPage(): void {
    if (this.isPdfReady && this.pdfViewer) {
      // Asegurar que la página esté dentro del rango válido
      const validPage = Math.max(1, Math.min(this.currentPage, this.totalPages));
      if (validPage !== this.currentPage) {
        this.currentPage = validPage;
      }
      this.pdfViewer.page = this.currentPage;
    }
  }

  private goToPage(page: number): void {
    this.currentPage = page;
    this.syncViewerPage();
  }

  async loadDocument() {
    // Force reset of all state
    this.isLoading = true;
    this.error = '';
    this.pdfSrc = null;
    this.currentPage = 1;
    this.totalPages = 1;
    this.zoom = 100;
    this.isPdfReady = false;

    // Force change detection to update UI
    this.cdr.detectChanges();

    // Wait for the modal to be fully rendered and DOM ready
    await new Promise(resolve => setTimeout(resolve, 200));

    if (!this.documentData) {
      this.isLoading = false;
      this.error = 'No se proporcionaron datos del documento.';
      this.cdr.detectChanges();
      return;
    }

    // Verificar si hay un error en los metadatos
    if (this.documentData.metadata?.error) {
      this.isLoading = false;
      this.error = this.documentData.metadata.error;
      this.cdr.detectChanges();
      return;
    }

    try {
      if (this.documentData.url) {
        // Priorizar URL si está disponible (mejor para visualización inmediata)
        this.pdfSrc = this.documentData.url;
      } else if (this.documentData.file) {
        // Si no hay URL, convertir File a ArrayBuffer o crear URL temporal
        // Para mejor compatibilidad, crear URL temporal del File
        try {
          this.pdfSrc = URL.createObjectURL(this.documentData.file);
        } catch (urlError) {
          console.warn('Error creating object URL, falling back to ArrayBuffer:', urlError);
          this.pdfSrc = await this.pdfService.fileToArrayBuffer(this.documentData.file);
        }
      } else {
        this.error = 'No hay un archivo o URL para mostrar.';
      }
      
      // Wait for PDF viewer container to be ready before final render
      if (this.pdfSrc) {
        await new Promise(resolve => setTimeout(resolve, 300));
        this.cdr.detectChanges();
      }
    } catch (e) {
      console.error('Error al cargar el documento:', e);
      this.error = 'Error al cargar el documento. Por favor, verifique que el archivo no esté corrupto.';
    } finally {
      this.isLoading = false;
      this.cdr.detectChanges();
    }
  }

  onPreviousPage() { if (this.currentPage > 1) this.goToPage(this.currentPage - 1); }
  onNextPage() { if (this.currentPage < this.totalPages) this.goToPage(this.currentPage + 1); }
  onZoomIn() { this.zoom += 25; }
  onZoomOut() { if (this.zoom > 25) this.zoom -= 25; }
  onZoomReset() { this.zoom = 100; }

  onClose() { 
    // Clean up object URLs to prevent memory leaks
    if (this.documentData?.url && this.documentData.url.startsWith('blob:')) {
      URL.revokeObjectURL(this.documentData.url);
    }
    
    // Clean up pdfSrc if it's a blob URL
    if (this.pdfSrc && typeof this.pdfSrc === 'string' && this.pdfSrc.startsWith('blob:')) {
      URL.revokeObjectURL(this.pdfSrc);
    }
    
    // Reset document state when closing
    this.pdfSrc = null;
    this.isLoading = true;
    this.error = '';
    this.currentPage = 1;
    this.totalPages = 1;
    this.zoom = 100;
    this.isPdfReady = false;
    this.cdr.detectChanges();
    this.close.emit(); 
  }
  onEdit() { this.edit.emit(); }
  onSend() { this.send.emit(); }

  onDownload(): void {
    if (!this.pdfSrc) return;
    const filename = this.pdfService.getFileName(this.documentData);
    this.pdfService.createDownloadBlob(this.pdfSrc, filename);
  }

  onPrint(): void {
    this.pdfViewerService.print();
  }

  onDelete(): void {
    this.discard.emit();
  }

  formatFileSize(bytes?: number): string {
    if (!bytes) return 'N/A';
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  }
}