import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-approvals',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './approvals.html',
  styleUrl: './approvals.css'
})
export class Approvals implements OnInit {
  onGestionar(id: string) {
    console.log('Gestionando solicitud con ID:', id);
  }
  ListaDeAprobaciones = [

     {
      tipo: 'VIATICOS',
      id: '001',
      fechaCreacion: '26/03/2025 12:00:00',
      usuarioCreador: 'USUARIO.HELISA',
      cargo: 'EMPLEADO',
      ultimaActualizacion: '27/03/2025 13:00:00',
      estado: 'APROBADOS',
      aprobadores: ['AS'], 
      prioridad: true 
    },
    {
      tipo: 'VIATICOS',
      id: '002',
      fechaCreacion: '26/03/2025 12:00:00',
      usuarioCreador: 'USUARIO.HELISA',
      cargo: 'EMPLEADO',
      ultimaActualizacion: '27/03/2025 13:00:00',
      estado: 'APROBADOS',
      aprobadores: ['LC', 'JS'],
      prioridad: true
    },
    {
      tipo: 'REQUISICIONES',
      id: '003',
      fechaCreacion: '26/03/2025 12:00:00',
      usuarioCreador: 'USUARIO.HELISA',
      cargo: 'EMPLEADO',
      ultimaActualizacion: '27/03/2025 13:00:00',
      estado: 'APROBADOS',
      aprobadores: ['LC', 'JS'],
      prioridad: false
    },
    {
    tipo: 'VIATICOS',
    id: '004',
    fechaCreacion: '27/03/2025 08:30:00',
    usuarioCreador: 'ANA.ROJAS',
    cargo: 'ANALISTA',
    ultimaActualizacion: '28/03/2025 10:00:00',
    estado: 'PENDIENTE',
    aprobadores: ['LC'],
    prioridad: false
  },
  {
    tipo: 'REQUISICIONES',
    id: '005',
    fechaCreacion: '26/03/2025 09:45:00',
    usuarioCreador: 'CARLOS.DIAZ',
    cargo: 'JEFE DE ÁREA',
    ultimaActualizacion: '27/03/2025 14:30:00',
    estado: 'APROBADOS',
    aprobadores: ['LC', 'JS'],
    prioridad: true
  },
  {
    tipo: 'VIATICOS',
    id: '006',
    fechaCreacion: '27/03/2025 11:20:00',
    usuarioCreador: 'MARIA.GOMEZ',
    cargo: 'EMPLEADO',
    ultimaActualizacion: '28/03/2025 08:00:00',
    estado: 'RECHAZADO',
    aprobadores: ['AS'],
    prioridad: false
  },
  {
    tipo: 'REQUISICIONES',
    id: '007',
    fechaCreacion: '28/03/2025 13:00:00',
    usuarioCreador: 'JUAN.PEREZ',
    cargo: 'COORDINADOR',
    ultimaActualizacion: '29/03/2025 16:00:00',
    estado: 'PENDIENTE',
    aprobadores: ['LC', 'AS'],
    prioridad: true
  },
  {
    tipo: 'VIATICOS',
    id: '008',
    fechaCreacion: '29/03/2025 15:30:00',
    usuarioCreador: 'LUISA.MORA',
    cargo: 'SUPERVISOR',
    ultimaActualizacion: '30/03/2025 09:00:00',
    estado: 'APROBADOS',
    aprobadores: ['JS'],
    prioridad: false
  },
  {
    tipo: 'REQUISICIONES',
    id: '009',
    fechaCreacion: '30/03/2025 07:50:00',
    usuarioCreador: 'FERNANDO.TORO',
    cargo: 'JEFE DE ÁREA',
    ultimaActualizacion: '30/03/2025 17:00:00',
    estado: 'APROBADOS',
    aprobadores: ['JS', 'LC'],
    prioridad: true
  },
  {
    tipo: 'VIATICOS',
    id: '010',
    fechaCreacion: '01/04/2025 10:15:00',
    usuarioCreador: 'CLAUDIA.VERA',
    cargo: 'EMPLEADO',
    ultimaActualizacion: '01/04/2025 14:00:00',
    estado: 'RECHAZADO',
    aprobadores: ['LC'],
    prioridad: false
  },
  {
    tipo: 'REQUISICIONES',
    id: '011',
    fechaCreacion: '02/04/2025 08:10:00',
    usuarioCreador: 'MARIO.SOSA',
    cargo: 'ANALISTA',
    ultimaActualizacion: '02/04/2025 16:30:00',
    estado: 'PENDIENTE',
    aprobadores: ['JS'],
    prioridad: true
  },
  {
    tipo: 'VIATICOS',
    id: '012',
    fechaCreacion: '03/04/2025 09:20:00',
    usuarioCreador: 'PATRICIA.OLIVER',
    cargo: 'SUPERVISOR',
    ultimaActualizacion: '04/04/2025 10:00:00',
    estado: 'APROBADOS',
    aprobadores: ['LC'],
    prioridad: false
  },
  {
    tipo: 'REQUISICIONES',
    id: '013',
    fechaCreacion: '04/04/2025 14:30:00',
    usuarioCreador: 'GABRIELA.MENDEZ',
    cargo: 'JEFE DE ÁREA',
    ultimaActualizacion: '05/04/2025 11:00:00',
    estado: 'RECHAZADO',
    aprobadores: ['AS'],
    prioridad: false
  }
  ]
  solicitudesMostradas: any[] = [];

  terminoBusqueda: string = '';
  mostrarSoloAprobados: boolean = false;
  
  constructor() { }

  ngOnInit(): void {
    this.aplicarFiltros();
  }
  ordenActual: string = '';
  ordenAscendente: boolean = true;

  ordenarPor(campo: string): void {
    if (this.ordenActual === campo) {
      this.ordenAscendente = !this.ordenAscendente;
    } else {
      this.ordenActual = campo;
      this.ordenAscendente = true;
    }

    this.solicitudesMostradas.sort((a, b) => {
      const valorA = a[campo];
      const valorB = b[campo];

      if (valorA < valorB) return this.ordenAscendente ? -1 : 1;
      if (valorA > valorB) return this.ordenAscendente ? 1 : -1;
      return 0;
    });
  }

  aplicarFiltros(): void {
    let solicitudesFiltradas = [...this.ListaDeAprobaciones];

    if (this.mostrarSoloAprobados) {
      solicitudesFiltradas = solicitudesFiltradas.filter(sol => sol.estado === 'APROBADOS');
    }

    if (this.terminoBusqueda) {
      const busqueda = this.terminoBusqueda.toLowerCase();
      solicitudesFiltradas = solicitudesFiltradas.filter(sol => 
        sol.tipo.toLowerCase().includes(busqueda) ||
        sol.usuarioCreador.toLowerCase().includes(busqueda)
      );
    }

    this.solicitudesMostradas = solicitudesFiltradas;
  }

  onToggleAprobados(event: any): void {
    this.mostrarSoloAprobados = event.target.checked;
    this.aplicarFiltros();
  }

  onBusquedaInput(event: any): void {
    this.terminoBusqueda = event.target.value;
    this.aplicarFiltros();
  }
}