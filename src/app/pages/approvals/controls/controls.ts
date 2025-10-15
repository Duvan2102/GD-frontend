import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-controls',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './controls.html',
  styleUrls: ['./controls.css'],
})
export class Controls {
  @Input() textoboton: string = 'Crear solicitud';
  @Input() quantity: number = 10;
  @Input() toggleApproved: boolean = false;
  @Input() search: string = '';

  @Input() labelMostrar: string = 'Mostrar';
  @Input() textoEntradas: string = 'Entradas';
  @Input() labelAprobados: string = 'APROBADOS';
  @Input() labelAprobadosInactivo: string = '';
  @Input() labelBuscar: string = 'Buscar:';
  @Input() placeholderBuscar: string = 'Buscar...';

  @Output() quantityChange = new EventEmitter<number>();
  @Output() toggleApprovedChange = new EventEmitter<boolean>();
  @Output() searchChange = new EventEmitter<string>();
  @Output() crear = new EventEmitter<void>();
}