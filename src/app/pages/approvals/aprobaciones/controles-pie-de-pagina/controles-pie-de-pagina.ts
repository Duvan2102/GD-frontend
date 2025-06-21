import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-controles-pie-de-pagina',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './controles-pie-de-pagina.html',
  styleUrls: ['./controles-pie-de-pagina.css'], 
})
export class ControlesPieDePagina {
  
  @Input() totalItems!: number;
  @Input() itemsPorPagina!: number;
  @Input() paginaActual!: number;

  @Output() cambiarPagina = new EventEmitter<number>();

  mostrarDropdown = false;
  timeoutId: any = null;

  get totalPaginas(): number {
    if (!this.totalItems || !this.itemsPorPagina) return 1;
    return Math.ceil(this.totalItems / this.itemsPorPagina);
  }

  get todasLasPaginas(): number[] {
    return Array.from({ length: this.totalPaginas }, (_, i) => i + 1);
  }

  get inicioRegistro(): number {
    if (this.totalItems === 0) return 0;
    return (this.paginaActual - 1) * this.itemsPorPagina + 1;
  }

  get finRegistro(): number {
    const fin = this.paginaActual * this.itemsPorPagina;
    return fin > this.totalItems ? this.totalItems : fin;
  }

  cambiarAPagina(pagina: number): void {
    if (pagina >= 1 && pagina <= this.totalPaginas && pagina !== this.paginaActual) {
      this.cambiarPagina.emit(pagina);
    }
  }

  seleccionarPagina(pagina: number): void {
    this.mostrarDropdown = false;
    this.cambiarAPagina(pagina);
  }

  ocultarDropdownConDelay(): void {
    this.timeoutId = setTimeout(() => {
      this.mostrarDropdown = false;
    }, 300);
  }

  cancelarOcultarDropdown(): void {
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
      this.timeoutId = null;
    }
  }
}
