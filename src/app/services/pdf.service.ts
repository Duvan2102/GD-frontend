import { Injectable, inject } from '@angular/core';
import { AuthService } from './auth.service';
import { Router } from '@angular/router';

@Injectable({
  providedIn: 'root'
})
export class PdfService {
  private isConfigured = false;
  private authService = inject(AuthService);
  private router = inject(Router);

  constructor() {
    this.configurePdfJs();
  }

  private configurePdfJs(): void {
    if (this.isConfigured) return;
    
    const originalWarn = console.warn;
    const originalError = console.error;
    
    console.warn = (...args: any[]) => {
      const message = args[0];
      if (typeof message === 'string' && 
          (message.includes('TT: undefined function') || 
           message.includes('Missing translations') ||
           message.includes('pdfjs-editor-add-signature-draw-thickness-range') ||
           message.includes('Hiding the "find" button') ||
           message.includes('TT: invalid function id') ||
           message.includes('CMYK fallback') ||
           message.includes('ICCBased color space'))) {
        return;
      }
      originalWarn.apply(console, args);
    };

    console.error = (...args: any[]) => {
      const message = args[0];
      if (typeof message === 'string' &&
          (message.includes('Worker was terminated') ||
           message.includes('startCleanup: Page') ||
           message.includes('scrollPageIntoView') ||
           message.includes('Cannot read properties of undefined'))) {
        return;
      }
      
      if (typeof message === 'string' && message.toLowerCase().includes('token expirado')) {
        console.warn('🔐 Token expirado detectado en PDF - Cerrando sesión y redirigiendo al login');
        this.authService.logoutSync();
        this.router.navigate(['/login'], { queryParams: { expired: 'true' } });
        return;
      }
      
      originalError.apply(console, args);
    };

    this.isConfigured = true;
  }

  async fileToArrayBuffer(file: File): Promise<ArrayBuffer> {
    return await file.arrayBuffer();
  }

  createDownloadBlob(pdfSrc: string | ArrayBuffer, filename: string = 'documento.pdf'): void {
    if (!pdfSrc) return;
    
    const blob = new Blob([pdfSrc as ArrayBuffer], { type: 'application/pdf' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.style.display = 'none';
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    a.remove();
  }

  isValidPdfFile(file: File): boolean {
    return file.type === 'application/pdf';
  }

  getFileName(documentData: any): string {
    if (documentData?.fileName) {
      return documentData.fileName;
    }
    if (documentData?.file?.name) {
      return documentData.file.name;
    }
    if (documentData?.title) {
      return documentData.title;
    }
    return 'Documento';
  }
}
