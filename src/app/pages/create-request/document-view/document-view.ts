import { Component, Input, Output, EventEmitter, OnChanges, SimpleChanges, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NgxExtendedPdfViewerModule, NgxExtendedPdfViewerService } from 'ngx-extended-pdf-viewer';

export interface DocumentViewData {
  id: string | number;
  file?: File;
  url?: string;
  title?: string;
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
    private pdfService: NgxExtendedPdfViewerService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['isVisible'] && this.isVisible) {
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

    try {
      if (this.documentData.file) {
        this.pdfSrc = await this.documentData.file.arrayBuffer();
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
    const blob = new Blob([this.pdfSrc as ArrayBuffer], { type: 'application/pdf' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.style.display = 'none';
    a.href = url;
    a.download = this.documentData?.file?.name || 'documento.pdf';
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    a.remove();
  }

  onPrint(): void {
    this.pdfService.print();
  }

  onDelete(): void {
    if (this.documentData?.id && confirm('¿Seguro que deseas eliminar esta solicitud?')) {
      this.deleteRequest.emit(this.documentData.id);
    }
  }
}