import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class PdfService {
  private isConfigured = false;

  constructor() {
    this.configurePdfJs();
  }

  private configurePdfJs(): void {
    if (this.isConfigured) return;
    
    // Suprimir warnings de PDF.js
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
        return; // Suprimir estos warnings específicos
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
        return; // Suprimir estos errores específicos de PDF.js
      }
      originalError.apply(console, args);
    };

    this.isConfigured = true;
  }

  /**
   * Convierte un archivo a ArrayBuffer para su uso en PDF.js
   */
  async fileToArrayBuffer(file: File): Promise<ArrayBuffer> {
    return await file.arrayBuffer();
  }

  /**
   * Crea un blob para descarga de PDF
   */
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

  /**
   * Valida si un archivo es un PDF válido
   */
  isValidPdfFile(file: File): boolean {
    return file.type === 'application/pdf';
  }

  /**
   * Obtiene el nombre del archivo de manera segura
   */
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
