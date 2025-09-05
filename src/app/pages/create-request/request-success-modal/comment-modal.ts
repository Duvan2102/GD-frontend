import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';

export interface CommentModalData {
  titulo: string;
  comentario: string;
  usuario: string;
  fecha: Date;
  tipo: 'APROBACION' | 'RECHAZO' | 'CANCELACION' | 'ENVIO';
}

@Component({
  selector: 'app-comment-modal',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div *ngIf="isVisible" class="modal-overlay" (click)="onClose()">
      <div class="modal-content" (click)="$event.stopPropagation()">
        <div class="modal-header">
          <h3 class="modal-title">{{ data?.titulo || 'Comentario' }}</h3>
          <button type="button" class="btn-close" (click)="onClose()" aria-label="Cerrar">
            <i class="bi bi-x-lg"></i>
          </button>
        </div>
        
        <div class="modal-body">
          <div class="comment-info">
            <div class="comment-meta">
              <span class="comment-user">
                <i class="bi bi-person-fill"></i>
                {{ data?.usuario }}
              </span>
              <span class="comment-date">
                <i class="bi bi-calendar3"></i>
                {{ formatDate(data?.fecha) }}
              </span>
              <span class="comment-type" [ngClass]="getTypeClass(data?.tipo)">
                <i class="bi" [ngClass]="getTypeIcon(data?.tipo)"></i>
                {{ data?.tipo }}
              </span>
            </div>
          </div>
          
          <div class="comment-content">
            <p>{{ data?.comentario || 'Sin comentario' }}</p>
          </div>
        </div>
        
        <div class="modal-footer">
          <button type="button" class="btn btn-secondary" (click)="onClose()">
            Cerrar
          </button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .modal-overlay {
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background-color: rgba(0, 0, 0, 0.5);
      display: flex;
      justify-content: center;
      align-items: center;
      z-index: 9999;
    }

    .modal-content {
      background: white;
      border-radius: 8px;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
      max-width: 600px;
      width: 90%;
      max-height: 80vh;
      overflow: hidden;
      display: flex;
      flex-direction: column;
    }

    .modal-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 1rem 1.5rem;
      border-bottom: 1px solid #e9ecef;
      background-color: #f8f9fa;
    }

    .modal-title {
      margin: 0;
      font-size: 1.25rem;
      font-weight: 600;
      color: #495057;
    }

    .btn-close {
      background: none;
      border: none;
      font-size: 1.25rem;
      color: #6c757d;
      cursor: pointer;
      padding: 0;
      width: 30px;
      height: 30px;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 4px;
      transition: all 0.2s ease;
    }

    .btn-close:hover {
      background-color: #e9ecef;
      color: #495057;
    }

    .modal-body {
      padding: 1.5rem;
      flex: 1;
      overflow-y: auto;
    }

    .comment-info {
      margin-bottom: 1rem;
    }

    .comment-meta {
      display: flex;
      flex-wrap: wrap;
      gap: 1rem;
      margin-bottom: 1rem;
    }

    .comment-user,
    .comment-date,
    .comment-type {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      font-size: 0.875rem;
      color: #6c757d;
    }

    .comment-type {
      padding: 0.25rem 0.5rem;
      border-radius: 4px;
      font-weight: 500;
    }

    .comment-type.aprobacion {
      background-color: #d1edff;
      color: #0c63e4;
    }

    .comment-type.rechazo {
      background-color: #f8d7da;
      color: #721c24;
    }

    .comment-type.cancelacion {
      background-color: #fff3cd;
      color: #856404;
    }

    .comment-type.envio {
      background-color: #d4edda;
      color: #155724;
    }

    .comment-content {
      background-color: #f8f9fa;
      padding: 1rem;
      border-radius: 6px;
      border-left: 4px solid #007bff;
    }

    .comment-content p {
      margin: 0;
      line-height: 1.6;
      color: #495057;
    }

    .modal-footer {
      padding: 1rem 1.5rem;
      border-top: 1px solid #e9ecef;
      background-color: #f8f9fa;
      display: flex;
      justify-content: flex-end;
    }

    .btn {
      padding: 0.5rem 1rem;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      font-weight: 500;
      transition: all 0.2s ease;
    }

    .btn-secondary {
      background-color: #6c757d;
      color: white;
    }

    .btn-secondary:hover {
      background-color: #5a6268;
    }

    @media (max-width: 576px) {
      .modal-content {
        width: 95%;
        margin: 1rem;
      }
      
      .comment-meta {
        flex-direction: column;
        gap: 0.5rem;
      }
    }
  `]
})
export class CommentModal {
  @Input() isVisible = false;
  @Input() data: CommentModalData | null = null;

  @Output() close = new EventEmitter<void>();

  onClose(): void {
    this.close.emit();
  }

  formatDate(date: Date | undefined): string {
    if (!date) return '';
    return new Date(date).toLocaleString('es-ES', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  getTypeClass(tipo: string | undefined): string {
    if (!tipo) return '';
    return tipo.toLowerCase();
  }

  getTypeIcon(tipo: string | undefined): string {
    switch (tipo) {
      case 'APROBACION':
        return 'bi-check-circle-fill';
      case 'RECHAZO':
        return 'bi-x-circle-fill';
      case 'CANCELACION':
        return 'bi-dash-circle-fill';
      case 'ENVIO':
        return 'bi-send-fill';
      default:
        return 'bi-chat-dots-fill';
    }
  }
}
