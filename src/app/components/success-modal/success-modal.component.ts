import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AlertType } from '../../services/success-modal.service';

@Component({
  selector: 'app-success-modal',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="modal-backdrop" [class.show]="isVisible" (click)="onBackdropClick()"></div>
    
    <div class="modal" [class.show]="isVisible" [style.display]="isVisible ? 'block' : 'none'">
      <div class="modal-dialog modal-dialog-centered">
        <div class="modal-content">
          <div class="modal-body text-center">
            <div class="alert-icon" [ngClass]="getIconClass()">
            </div>
            <h5 class="modal-title">{{ title || 'Proceso completado con éxito' }}</h5>
            <p class="modal-message">{{ message || 'La operación se ha realizado correctamente.' }}</p>
            <button 
              type="button" 
              class="btn" 
              [ngClass]="getButtonClass()"
              (click)="onAccept()">
              Aceptar
            </button>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .modal-backdrop {
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.6);
      backdrop-filter: blur(10px);
      -webkit-backdrop-filter: blur(10px);
      z-index: 1054 !important;
      opacity: 0;
      visibility: hidden;
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    }

    .modal-backdrop.show {
      opacity: 1;
      visibility: visible;
      z-index: 1054 !important;
    }

    .modal {
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      z-index: 1055 !important;
      display: none;
      overflow: hidden;
      outline: 0;
    }

    .modal.show {
      display: block;
      z-index: 1055 !important;
    }

    .modal-dialog {
      position: relative;
      width: auto;
      margin: 0.5rem;
      pointer-events: none;
    }

    .modal-dialog-centered {
      display: flex;
      align-items: center;
      min-height: calc(100% - 1rem);
    }

    .modal-content {
      position: relative;
      display: flex;
      flex-direction: column;
      width: 100%;
      pointer-events: auto;
      background-color: #fff;
      background-clip: padding-box;
      border: 1px solid rgba(0, 0, 0, 0.2);
      border-radius: 0.3rem;
      box-shadow: 0 0.25rem 0.5rem rgba(0, 0, 0, 0.5);
    }

    .modal-body {
      position: relative;
      flex: 1 1 auto;
      padding: 2rem;
    }

    .alert-icon {
      font-size: 4rem;
      margin-bottom: 1rem;
    }

    .alert-icon.success-icon {
      color: #28a745;
    }

    .alert-icon.error-icon {
      color: #dc3545;
    }

    .alert-icon.warning-icon {
      color: #ffc107;
    }

    .alert-icon.info-icon {
      color: #17a2b8;
    }

    .modal-title {
      color: #333;
      font-weight: 600;
      margin-bottom: 1rem;
      font-size: 1.25rem;
    }

    .modal-message {
      color: #666;
      margin-bottom: 2rem;
      font-size: 1rem;
    }

    .btn {
      padding: 0.75rem 2rem;
      font-size: 1rem;
      font-weight: 500;
      border-radius: 0.375rem;
      border: 1px solid transparent;
      cursor: pointer;
      transition: all 0.15s ease-in-out;
      color: #fff;
    }

    .btn-success {
      background-color: #28a745;
      border-color: #28a745;
    }

    .btn-success:hover {
      background-color: #218838;
      border-color: #1e7e34;
    }

    .btn-success:focus {
      box-shadow: 0 0 0 0.2rem rgba(40, 167, 69, 0.5);
    }

    .btn-danger {
      background-color: #dc3545;
      border-color: #dc3545;
    }

    .btn-danger:hover {
      background-color: #c82333;
      border-color: #bd2130;
    }

    .btn-danger:focus {
      box-shadow: 0 0 0 0.2rem rgba(220, 53, 69, 0.5);
    }

    .btn-warning {
      background-color: #ffc107;
      border-color: #ffc107;
      color: #212529;
    }

    .btn-warning:hover {
      background-color: #e0a800;
      border-color: #d39e00;
    }

    .btn-warning:focus {
      box-shadow: 0 0 0 0.2rem rgba(255, 193, 7, 0.5);
    }

    .btn-info {
      background-color: #17a2b8;
      border-color: #17a2b8;
    }

    .btn-info:hover {
      background-color: #138496;
      border-color: #117a8b;
    }

    .btn-info:focus {
      box-shadow: 0 0 0 0.2rem rgba(23, 162, 184, 0.5);
    }

    @media (min-width: 576px) {
      .modal-dialog {
        max-width: 400px;
        margin: 1.75rem auto;
      }
    }
  `]
})
export class SuccessModalComponent {
  @Input() isVisible = false;
  @Input() title = 'Proceso completado con éxito';
  @Input() message = 'La operación se ha realizado correctamente.';
  @Input() type: AlertType = 'success';
  @Output() accept = new EventEmitter<void>();

  getIconClass(): string {
    switch (this.type) {
      case 'error':
        return 'bi bi-x-circle-fill error-icon';
      case 'warning':
        return 'bi bi-exclamation-triangle-fill warning-icon';
      case 'info':
        return 'bi bi-info-circle-fill info-icon';
      case 'success':
      default:
        return 'bi bi-check-circle-fill success-icon';
    }
  }

  getButtonClass(): string {
    switch (this.type) {
      case 'error':
        return 'btn-danger';
      case 'warning':
        return 'btn-warning';
      case 'info':
        return 'btn-info';
      case 'success':
      default:
        return 'btn-success';
    }
  }

  onAccept() {
    this.accept.emit();
  }

  onBackdropClick() {
    this.accept.emit();
  }
}
