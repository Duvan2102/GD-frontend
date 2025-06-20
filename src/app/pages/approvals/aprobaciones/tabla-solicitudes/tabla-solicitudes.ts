
import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';


@Component({
  selector: 'app-tabla-solicitudes',
  standalone: true,
  imports: [
    CommonModule
  ],
  templateUrl: './tabla-solicitudes.html',
  styleUrls: ['./tabla-solicitudes.css']
})
export class TablaSolicitudes {
  @Input() solicitudes: any[] = [];
  @Input() totalItems: number = 0;
  @Input() ordenActual: string = '';
  @Input() ordenAscendente: boolean = true;
  @Input() paginaActual: number = 1;
  @Input() itemsPorPagina: number = 10;
  @Input() vistaDetallada: boolean = false;

  @Output() ordenar = new EventEmitter<string>();
  @Output() gestionar = new EventEmitter<string>();
   @Output() cambiarPagina = new EventEmitter<number>();

 
  getSortIcon(campo: string): any {
    if (this.ordenActual !== campo) return { 'bi-arrow-down-up': true, 'text-muted': true };
    return this.ordenAscendente ? { 'bi-arrow-down': true } : { 'bi-arrow-up': true };
  }
}