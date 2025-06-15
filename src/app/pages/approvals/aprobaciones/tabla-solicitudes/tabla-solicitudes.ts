// src/app/pages/approvals/aprobaciones/tabla-solicitudes/tabla-solicitudes.ts
import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
// ¡IMPORTANTE! Importar el nuevo componente
import { ControlesPieDePaginaComponent } from '../controles-pie-de-pagina/controles-pie-de-pagina';

@Component({
  selector: 'app-tabla-solicitudes',
  standalone: true,
  imports: [
    CommonModule
  ],
  templateUrl: './tabla-solicitudes.html',
  styleUrls: ['./tabla-solicitudes.css']
})
export class TablaSolicitudesComponent {
  // --- INPUTS: Datos que recibe del padre ---
  @Input() solicitudes: any[] = [];
  @Input() totalItems: number = 0;
  @Input() ordenActual: string = '';
  @Input() ordenAscendente: boolean = true;
  @Input() paginaActual: number = 1;
  @Input() itemsPorPagina: number = 10;
  @Input() vistaDetallada: boolean = false;

  // --- OUTPUTS: Eventos que envía al padre ---
  @Output() ordenar = new EventEmitter<string>();
  @Output() gestionar = new EventEmitter<string>();
  // Este evento ahora simplemente RE-EMITE el evento de su hijo
  @Output() cambiarPagina = new EventEmitter<number>();

  // La lógica de los getters de paginación ha sido ELIMINADA de aquí.

  getSortIcon(campo: string): any {
    if (this.ordenActual !== campo) return { 'bi-arrow-down-up': true, 'text-muted': true };
    return this.ordenAscendente ? { 'bi-arrow-down': true } : { 'bi-arrow-up': true };
  }
}