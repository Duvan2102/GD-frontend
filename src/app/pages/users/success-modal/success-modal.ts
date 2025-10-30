import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-success-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './success-modal.html',
  styleUrls: ['./success-modal.css']
})
export class SuccessModal {
  @Input() visible: boolean = false;
  @Input() mensaje: string = '';
  @Input() mensajeSecundario: string = '';
  @Input() textoBtn: string = 'Aceptar';
  @Output() aceptar = new EventEmitter<void>();
}
