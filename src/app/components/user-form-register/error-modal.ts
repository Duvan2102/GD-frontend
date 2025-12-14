import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-error-modal',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="custom-backdrop" [class.show]="visible" (click)="onBackdropClick()"></div>
    
    <div class="modal" tabindex="-1" [class.show]="visible" [style.display]="visible ? 'block' : 'none'" (click)="onBackdropClick()">
      <div class="modal-dialog modal-dialog-centered" role="document">
        <div class="modal-content password-modal" (click)="$event.stopPropagation()">

          <div class="modal-header">
            <h5 class="modal-title">{{ titulo || 'Error' }}</h5>
            <button type="button" class="btn-close" aria-label="Cerrar" (click)="aceptar.emit()"></button>
          </div>

          <div class="modal-body text-center">
            <div class="error-icon-container mb-3">
              <i class="bi bi-exclamation-triangle-fill error-icon-large"></i>
            </div>
            <div class="error-message-container">
              <p class="error-message" [innerHTML]="mensaje"></p>
            </div>
          </div>

          <div class="modal-footer">
            <button type="button" class="btn btn-primary" (click)="aceptar.emit()">
              {{ textoBtn || 'Aceptar' }}
            </button>
          </div>

        </div>
      </div>
    </div>
  `,
  styles: [`
    .custom-backdrop {
      position: fixed;
      top: 0;
      left: 0;
      width: 100vw;
      height: 100vh;
      background-color: rgba(0, 0, 0, 0.7);
      backdrop-filter: blur(8px);
      -webkit-backdrop-filter: blur(8px);
      z-index: 1040;
      opacity: 0;
      transition: opacity 0.3s ease-in-out;
    }

    .custom-backdrop.show {
      opacity: 1;
    }

    .modal {
      position: fixed;
      top: 0;
      left: 0;
      z-index: 1055;
      width: 100%;
      height: 100%;
      overflow-x: hidden;
      overflow-y: auto;
      outline: 0;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .modal.show {
      display: flex !important;
    }

    .modal-dialog {
      position: relative;
      width: auto;
      margin: 1.75rem auto;
      pointer-events: none;
      max-width: 500px;
      width: 90vw;
    }

    .modal-dialog-centered {
      display: flex;
      align-items: center;
      min-height: calc(100% - 3.5rem);
    }

    .error-icon-container {
      display: flex;
      justify-content: center;
      align-items: center;
    }

    .error-icon-large {
      font-size: 4rem;
      color: #dc3545;
    }

    .modal-body {
      padding: 1.5rem;
    }

    .modal-title-custom {
      font-size: 1.25rem;
      font-weight: 600;
      color: #46655a;
      line-height: 1.4;
    }

    .error-message-container {
      max-height: 300px;
      overflow-y: auto;
      margin-bottom: 1rem;
      text-align: left;
      background: #fff5f5;
      padding: 1rem;
      border-radius: 8px;
      border-left: 4px solid #dc3545;
      border: 1px solid #f8d7da;
      margin-top: 1rem;
    }

    .error-message-container::-webkit-scrollbar {
      width: 6px;
    }

    .error-message-container::-webkit-scrollbar-track {
      background: #f8f9fa;
    }

    .error-message-container::-webkit-scrollbar-thumb {
      background-color: #dc3545;
      border-radius: 10px;
    }

    .error-message {
      font-size: 0.95rem;
      color: #721c24;
      line-height: 1.6;
      margin: 0;
      white-space: pre-line;
    }

    .error-message ::ng-deep ul {
      margin: 0.5rem 0;
      padding-left: 1.5rem;
    }

    .error-message ::ng-deep li {
      margin-bottom: 0.25rem;
    }


    .text-center {
      text-align: center;
    }

    .mb-3 {
      margin-bottom: 1rem;
    }

    .mt-3 {
      margin-top: 1rem;
    }
  `]
})
export class ErrorModal {
  @Input() visible: boolean = false;
  @Input() titulo: string = 'Error';
  @Input() mensaje: string = '';
  @Input() textoBtn: string = 'Aceptar';
  @Output() aceptar = new EventEmitter<void>();

  onBackdropClick() {
    this.aceptar.emit();
  }
}

