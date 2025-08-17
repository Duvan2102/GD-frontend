import { Component, Input, Output, EventEmitter, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SolicitudData } from '../create-form/create-form';
import { Usuario } from '../../../interfaces/common.interfaces';

export interface AprobadorTabla {
  usuarioId: string;
  nombresApellidos: string;
  correo: string;
  area: string;
  fecha: Date;
  estado: 'Enviado' | 'Aprobado' | 'Rechazado' | 'Cancelado' | 'Pendiente';
  orden?: number;
}

export interface SuccessModalData extends SolicitudData {
  id?: string | number;
  creador: Usuario | null;
  fechaCreacion?: Date;
  estado?:'Cancelada' | 'Aprobada' | 'Rechazada' | 'Pendiente';
}

@Component({
  selector: 'app-request-success-modal',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './request-success-modal.html',
  styleUrls: ['./request-success-modal.css']
})
export class RequestSuccessModal implements OnChanges {
  @Input() isVisible = false;
  @Input() data: SuccessModalData | null = null;
  @Input() usuariosDisponibles: Usuario[] = [];
  @Output() close = new EventEmitter<void>();
  @Output() cancelRequest = new EventEmitter<{ solicitudId: string | number }>();

  approvers: AprobadorTabla[] = [];

  ngOnChanges(changes: SimpleChanges): void {
    if ((changes['data'] || changes['usuariosDisponibles']) && this.data) {
      this.loadApprovers();
    }
  }

  private loadApprovers(): void {
    if (!this.data?.destinatarios || this.usuariosDisponibles.length === 0) {
      this.approvers = [];
      return;
    }

    this.approvers = this.data.destinatarios.map((dest) => {
      const usuario = this.usuariosDisponibles.find(u => u.usuario === dest.usuarioId);

      return {
        usuarioId: dest.usuarioId,
        nombresApellidos: usuario ? `${usuario.nombres} ${usuario.apellidos}` : 'Usuario no encontrado',
        correo: (usuario as any)?.correo || 'correo@ejemplo.com',
        area: (usuario as any)?.area || 'Área no especificada',
        fecha: this.data?.fechaCreacion || new Date(),
        estado: this.getEstadoAprobador(dest.usuarioId),
        orden: dest.orden
      };
    }).sort((a, b) => (a.orden || 0) - (b.orden || 0));
  }

  private getEstadoAprobador(usuarioId: string): 'Enviado' | 'Aprobado' | 'Rechazado' | 'Cancelado' | 'Pendiente' {
    if (this.data?.estado === 'Cancelada') {
      return 'Cancelado';
    }
    if (this.data?.estado === 'Pendiente') {
        return 'Pendiente';
    }
    return 'Enviado';
  }

  onClose(): void {
    this.close.emit();
  }

  onCancelRequest(): void {
    if (!this.data?.id) return;

    const confirmCancel = confirm('¿Está seguro de que desea cancelar esta solicitud? Esta acción no se puede deshacer.');

    if (confirmCancel) {
      this.cancelRequest.emit({
        solicitudId: this.data.id
      });
    }
  }

  getStatusClass(estado: string): string {
    switch (estado) {
      case 'APROBADO':
      case 'Aprobado':
        return 'text-bg-success';
      case 'RECHAZADO':
      case 'Rechazado':
        return 'text-bg-danger';
      case 'CANCELADA':
      case 'Cancelado':
        return 'text-bg-secondary';
      case 'PENDIENTE':
      case 'Pendiente':
        return 'text-bg-warning';
      default:
        return 'text-bg-info';
    }
  }

  canCancelRequest(): boolean {
    return this.data?.estado !== 'Cancelada' &&
           this.data?.estado !== 'Aprobada' &&
           this.data?.estado !== 'Rechazada';
  }

  formatDate(date: Date | undefined): string {
    const dateToFormat = date ? new Date(date) : new Date();
    return new Intl.DateTimeFormat('es-ES', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true
    }).format(dateToFormat);
  }

  viewDocument(doc: File | undefined): void {
    if (doc instanceof File) {
      const fileURL = URL.createObjectURL(doc);
      window.open(fileURL, '_blank');
    }
  }

  trackByApprover(index: number, approver: AprobadorTabla): string {
    return approver.usuarioId;
  }

  getDocumentName(doc: File | undefined): string {
    if (doc) {
      if (doc instanceof File) {
        return doc.name;
      }
      return (doc as any)?.nombre || 'Documento';
    }
    return 'Documento';
  }

  getCreatorInitials(): string {
    if (!this.data?.creador) return '';
    const nombres = this.data.creador.nombres?.charAt(0) || '';
    const apellidos = this.data.creador.apellidos?.charAt(0) || '';
    return (nombres + apellidos).toUpperCase();
  }
}