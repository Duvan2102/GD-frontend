import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';

import { Controles } from './controles/controles';
import { TablaSolicitudes } from './tabla-solicitudes/tabla-solicitudes';
import { ControlesPieDePagina } from './controles-pie-de-pagina/controles-pie-de-pagina';

@Component({
  selector: 'app-aprobaciones',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    Controles,
    TablaSolicitudes,
    ControlesPieDePagina
  ],
  templateUrl: './aprobaciones.html',
  styleUrls: ['./aprobaciones.css']
})
export class Aprobaciones implements OnInit {
  ListaDeAprobaciones = [
    { tipo: 'VIATICOS', id: '001', fechaCreacion: '2025-03-26T12:00:00', usuarioCreador: 'USUARIO.HELISA', cargo: 'EMPLEADO', ultimaActualizacion: '2025-03-27T13:00:00', estado: 'APROBADO', aprobadores: ['AS'], prioridad: true },
    { tipo: 'VIATICOS', id: '002', fechaCreacion: '2025-03-26T12:00:00', usuarioCreador: 'USUARIO.HELISA', cargo: 'EMPLEADO', ultimaActualizacion: '2025-03-27T13:00:00', estado: 'APROBADO', aprobadores: ['LC', 'JS'], prioridad: true },
    { tipo: 'REQUISICIONES', id: '003', fechaCreacion: '2025-03-26T12:00:00', usuarioCreador: 'USUARIO.HELISA', cargo: 'EMPLEADO', ultimaActualizacion: '2025-03-27T13:00:00', estado: 'APROBADO', aprobadores: ['LC', 'JS'], prioridad: false },
    { tipo: 'VIATICOS', id: '004', fechaCreacion: '2025-03-27T08:30:00', usuarioCreador: 'ANA.ROJAS', cargo: 'ANALISTA', ultimaActualizacion: '2025-03-28T10:00:00', estado: 'PENDIENTE', aprobadores: ['LC'], prioridad: false },
    { tipo: 'REQUISICIONES', id: '005', fechaCreacion: '2025-03-26T09:45:00', usuarioCreador: 'CARLOS.DIAZ', cargo: 'JEFE DE ÁREA', ultimaActualizacion: '2025-03-27T14:30:00', estado: 'APROBADO', aprobadores: ['LC', 'JS'], prioridad: true },
    { tipo: 'VIATICOS', id: '006', fechaCreacion: '2025-03-27T11:20:00', usuarioCreador: 'MARIA.GOMEZ', cargo: 'EMPLEADO', ultimaActualizacion: '2025-03-28T08:00:00', estado: 'RECHAZADO', aprobadores: ['AS'], prioridad: false },
    { tipo: 'REQUISICIONES', id: '007', fechaCreacion: '2025-03-28T13:00:00', usuarioCreador: 'JUAN.PEREZ', cargo: 'COORDINADOR', ultimaActualizacion: '2025-03-29T16:00:00', estado: 'PENDIENTE', aprobadores: ['LC', 'AS'], prioridad: true },
    { tipo: 'VIATICOS', id: '008', fechaCreacion: '2025-03-29T15:30:00', usuarioCreador: 'LUISA.MORA', cargo: 'SUPERVISOR', ultimaActualizacion: '2025-03-30T09:00:00', estado: 'APROBADO', aprobadores: ['JS'], prioridad: false },
    { tipo: 'REQUISICIONES', id: '009', fechaCreacion: '2025-03-30T07:50:00', usuarioCreador: 'FERNANDO.TORO', cargo: 'JEFE DE ÁREA', ultimaActualizacion: '2025-03-30T17:00:00', estado: 'APROBADO', aprobadores: ['JS', 'LC'], prioridad: true },
    { tipo: 'VIATICOS', id: '010', fechaCreacion: '2025-04-01T10:15:00', usuarioCreador: 'CLAUDIA.VERA', cargo: 'EMPLEADO', ultimaActualizacion: '2025-04-01T14:00:00', estado: 'RECHAZADO', aprobadores: ['LC'], prioridad: false },
    { tipo: 'REQUISICIONES', id: '011', fechaCreacion: '2025-04-02T08:10:00', usuarioCreador: 'MARIO.SOSA', cargo: 'ANALISTA', ultimaActualizacion: '2025-04-02T16:30:00', estado: 'PENDIENTE', aprobadores: ['JS'], prioridad: true },
    { tipo: 'VIATICOS', id: '012', fechaCreacion: '2025-04-03T09:20:00', usuarioCreador: 'PATRICIA.OLIVER', cargo: 'SUPERVISOR', ultimaActualizacion: '2025-04-04T10:00:00', estado: 'APROBADO', aprobadores: ['LC'], prioridad: false },
    { tipo: 'REQUISICIONES', id: '013', fechaCreacion: '2025-04-04T14:30:00', usuarioCreador: 'GABRIELA.MENDEZ', cargo: 'JEFE DE ÁREA', ultimaActualizacion: '2025-04-05T11:00:00', estado: 'RECHAZADO', aprobadores: ['AS'], prioridad: false },
    { tipo: 'VIATICOS', id: '014', fechaCreacion: '2025-03-26T12:00:00', usuarioCreador: 'USUARIO.HELISA', cargo: 'EMPLEADO', ultimaActualizacion: '2025-03-27T13:00:00', estado: 'APROBADO', aprobadores: ['AS'], prioridad: true },
    { tipo: 'VIATICOS', id: '015', fechaCreacion: '2025-03-26T12:00:00', usuarioCreador: 'USUARIO.HELISA', cargo: 'EMPLEADO', ultimaActualizacion: '2025-03-27T13:00:00', estado: 'APROBADO', aprobadores: ['LC', 'JS'], prioridad: true },
    { tipo: 'REQUISICIONES', id: '016', fechaCreacion: '2025-03-26T12:00:00', usuarioCreador: 'USUARIO.HELISA', cargo: 'EMPLEADO', ultimaActualizacion: '2025-03-27T13:00:00', estado: 'APROBADO', aprobadores: ['LC', 'JS'], prioridad: false },
    { tipo: 'VIATICOS', id: '017', fechaCreacion: '2025-03-27T08:30:00', usuarioCreador: 'ANA.ROJAS', cargo: 'ANALISTA', ultimaActualizacion: '2025-03-28T10:00:00', estado: 'PENDIENTE', aprobadores: ['LC'], prioridad: false },
    { tipo: 'REQUISICIONES', id: '018', fechaCreacion: '2025-03-26T09:45:00', usuarioCreador: 'CARLOS.DIAZ', cargo: 'JEFE DE ÁREA', ultimaActualizacion: '2025-03-27T14:30:00', estado: 'APROBADO', aprobadores: ['LC', 'JS'], prioridad: true },
    { tipo: 'VIATICOS', id: '019', fechaCreacion: '2025-03-27T11:20:00', usuarioCreador: 'MARIA.GOMEZ', cargo: 'EMPLEADO', ultimaActualizacion: '2025-03-28T08:00:00', estado: 'RECHAZADO', aprobadores: ['AS'], prioridad: false },
    { tipo: 'REQUISICIONES', id: '020', fechaCreacion: '2025-03-28T13:00:00', usuarioCreador: 'JUAN.PEREZ', cargo: 'COORDINADOR', ultimaActualizacion: '2025-03-29T16:00:00', estado: 'PENDIENTE', aprobadores: ['LC', 'AS'], prioridad: true },
    { tipo: 'VIATICOS', id: '021', fechaCreacion: '2025-03-29T15:30:00', usuarioCreador: 'LUISA.MORA', cargo: 'SUPERVISOR', ultimaActualizacion: '2025-03-30T09:00:00', estado: 'APROBADO', aprobadores: ['JS'], prioridad: false },
    { tipo: 'REQUISICIONES', id: '022', fechaCreacion: '2025-03-30T07:50:00', usuarioCreador: 'FERNANDO.TORO', cargo: 'JEFE DE ÁREA', ultimaActualizacion: '2025-03-30T17:00:00', estado: 'APROBADO', aprobadores: ['JS', 'LC'], prioridad: true },
    { tipo: 'VIATICOS', id: '023', fechaCreacion: '2025-04-01T10:15:00', usuarioCreador: 'CLAUDIA.VERA', cargo: 'EMPLEADO', ultimaActualizacion: '2025-04-01T14:00:00', estado: 'RECHAZADO', aprobadores: ['LC'], prioridad: false },
    { tipo: 'REQUISICIONES', id: '024', fechaCreacion: '2025-04-02T08:10:00', usuarioCreador: 'MARIO.SOSA', cargo: 'ANALISTA', ultimaActualizacion: '2025-04-02T16:30:00', estado: 'PENDIENTE', aprobadores: ['JS'], prioridad: true },
    { tipo: 'VIATICOS', id: '025', fechaCreacion: '2025-04-03T09:20:00', usuarioCreador: 'PATRICIA.OLIVER', cargo: 'SUPERVISOR', ultimaActualizacion: '2025-04-04T10:00:00', estado: 'APROBADO', aprobadores: ['LC'], prioridad: false },
    { tipo: 'REQUISICIONES', id: '026', fechaCreacion: '2025-04-04T14:30:00', usuarioCreador: 'GABRIELA.MENDEZ', cargo: 'JEFE DE ÁREA', ultimaActualizacion: '2025-04-05T11:00:00', estado: 'RECHAZADO', aprobadores: ['AS'], prioridad: false }
  ];


  solicitudesMostradas: any[] = [];
  private solicitudesFiltradas: any[] = [];
  totalFiltrado: number = 0;

 
  terminoBusqueda: string = '';
  mostrarSoloAprobados: boolean = false;
  paginaActual: number = 1;
  cantidadAMostrar: number = 10;
  ordenActual: string = 'fechaCreacion'; 
  ordenAscendente: boolean = false; 

  ngOnInit(): void {
    this.aplicarLogicaDeVista();
  }

  
  aplicarLogicaDeVista(): void {
    
    let resultado = [...this.ListaDeAprobaciones];
    if (this.mostrarSoloAprobados) {
      resultado = resultado.filter(sol => sol.estado === 'APROBADO');
    }
    if (this.terminoBusqueda) {
      const busqueda = this.terminoBusqueda.toLowerCase();
      resultado = resultado.filter(sol => 
        sol.tipo.toLowerCase().includes(busqueda) ||
        sol.usuarioCreador.toLowerCase().includes(busqueda) ||
        sol.id.toLowerCase().includes(busqueda)
      );
    }
    this.solicitudesFiltradas = resultado;
    this.totalFiltrado = this.solicitudesFiltradas.length;

    
    if (this.ordenActual) {
      this.solicitudesFiltradas.sort((a, b) => {
        const valorA = (a as any)[this.ordenActual];
        const valorB = (b as any)[this.ordenActual];
        if (valorA < valorB) return this.ordenAscendente ? -1 : 1;
        if (valorA > valorB) return this.ordenAscendente ? 1 : -1;
        return 0;
      });
    }

    
    const inicio = (this.paginaActual - 1) * this.cantidadAMostrar;
    this.solicitudesMostradas = this.solicitudesFiltradas.slice(inicio, inicio + this.cantidadAMostrar);
  }
  
  
  onToggleAprobado(value: boolean): void {
    this.mostrarSoloAprobados = value;
    this.paginaActual = 1;
    this.aplicarLogicaDeVista();
  }

  onCantidadChange(cantidad: number): void {
    this.cantidadAMostrar = Number(cantidad);
    this.paginaActual = 1;
    this.aplicarLogicaDeVista();
  }

  onBusquedaChange(termino: string): void {
    this.terminoBusqueda = termino;
    this.paginaActual = 1;
    this.aplicarLogicaDeVista();
  }

  onCambiarPagina(nuevaPagina: number): void {
    this.paginaActual = nuevaPagina;
    this.aplicarLogicaDeVista();
  }

  ordenarPor(campo: string): void {
    if (this.ordenActual === campo) {
      this.ordenAscendente = !this.ordenAscendente;
    } else {
      this.ordenActual = campo;
      this.ordenAscendente = true;
    }
    this.aplicarLogicaDeVista();
  }

  onGestionar(id: string): void {
    console.log('Gestionando solicitud con ID desde el padre:', id);
  }
}