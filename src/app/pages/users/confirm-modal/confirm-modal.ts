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
  @Input() icono: string = 'bi bi-exclamation-octagon-fill'; 
  @Input() colorAceptar: string = '#609179'; 
  @Input() colorCancelar: string = '#A34133';

  @Output() aceptar = new EventEmitter<void>();
  @Output() cancelar = new EventEmitter<void>();
}
