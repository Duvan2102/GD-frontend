import { Component, Input, Output, EventEmitter, OnChanges, SimpleChanges, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NgxExtendedPdfViewerModule, NgxExtendedPdfViewerService } from 'ngx-extended-pdf-viewer';
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
  @Output() close = new EventEmitter<void>();
  @Output() edit = new EventEmitter<void>();
  @Output() send = new EventEmitter<void>();
  @Output() deleteRequest = new EventEmitter<string | number>();

  pdfSrc: string | ArrayBuffer | null = null;
  isLoading = true;
  error = '';
  currentPage = 1;
  totalPages = 1;
  zoom = 100;

  constructor(
    private pdfViewerService: NgxExtendedPdfViewerService,
    private pdfService: PdfService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['isVisible'] && this.isVisible) {
      this.loadDocument();
    }
    if (changes['documentData'] && this.documentData) {
      this.loadDocument();
    }
  }

  public onPagesLoaded(event: any): void {
    this.totalPages = event.pagesCount;
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

    // Verificar si hay un error en los metadatos
    if (this.documentData.metadata?.error) {
      this.isLoading = false;
      this.error = this.documentData.metadata.error;
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
      console.error('Error al cargar el documento:', e);
      this.error = 'Error al cargar el documento. Por favor, verifique que el archivo no esté corrupto.';
    } finally {
      this.isLoading = false;
      this.cdr.detectChanges();
    }
  }

  onPreviousPage() { if (this.currentPage > 1) this.currentPage--; }
  onNextPage() { if (this.currentPage < this.totalPages) this.currentPage++; }
  onZoomIn() { this.zoom += 25; }
  onZoomOut() { if (this.zoom > 25) this.zoom -= 25; }
  onZoomReset() { this.zoom = 100; }

  onClose() { this.close.emit(); }
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
    if (this.documentData?.id && confirm('¿Seguro que deseas eliminar esta solicitud?')) {
      this.deleteRequest.emit(this.documentData.id);
    }
  }

  formatFileSize(bytes?: number): string {
    if (!bytes) return 'N/A';
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  }
}