import { Component, Input, Output, EventEmitter, OnChanges, SimpleChanges, ChangeDetectorRef, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NgxExtendedPdfViewerModule, PdfLoadedEvent, NgxExtendedPdfViewerService, PagesLoadedEvent } from 'ngx-extended-pdf-viewer';

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
  imports: [CommonModule, NgxExtendedPdfViewerModule],
  templateUrl: './approval-document-view.html',
  styleUrls: ['./approval-document-view.css']
})
export class ApprovalDocumentView implements OnChanges, OnDestroy {
  @Input() isVisible = false;
  @Input() documentData: ApprovalDocumentViewData | null = null;
  @Output() close = new EventEmitter<void>();
  @Output() approve = new EventEmitter<string | number>();
  @Output() reject = new EventEmitter<string | number>();
  
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

  private scrollListener?: (event: Event) => void;

  constructor(
    private cdr: ChangeDetectorRef,
    private pdfService: NgxExtendedPdfViewerService
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
    if (this.documentData) {
      this.approve.emit(this.documentData.id);
    }
  }

  onReject() {
    if (this.documentData) {
      this.reject.emit(this.documentData.id);
    }
  }

  onBack() {
    this.back.emit();
  }

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

  onPreviousPage() { if (this.currentPage > 1) this.currentPage--; }
  onNextPage() { if (this.currentPage < this.totalPages) this.currentPage++; }
  onZoomIn() { this.zoom += 25; }
  onZoomOut() { if (this.zoom > 25) this.zoom -= 25; }
  onZoomReset() { this.zoom = 100; }

  getFileName(): string {
    if (this.documentData?.fileName) {
      return this.documentData.fileName;
    }
    if (this.documentData?.file?.name) {
      return this.documentData.file.name;
    }
    if (this.documentData?.title) {
      return this.documentData.title;
    }
    return 'Documento';
  }
}