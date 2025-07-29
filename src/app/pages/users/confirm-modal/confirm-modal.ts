import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-confirm-modal',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './confirm-modal.html',
  styleUrls: ['./confirm-modal.css']
})
export class ConfirmModal {
  @Input() visible: boolean = false;
  @Input() mensaje: string = '';
  @Input() textoAceptar: string = 'Aceptar';
  @Input() textoCancelar: string = 'Cancelar';
  @Input() icono: string = 'bi bi-exclamation-octagon-fill'; // Bootstrap icon class (puedes cambiarla)
  @Input() colorAceptar: string = '#609179'; // Verde institucional
  @Input() colorCancelar: string = '#A34133'; // Rojo institucional

  @Output() aceptar = new EventEmitter<void>();
  @Output() cancelar = new EventEmitter<void>();
}
