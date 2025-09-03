import { Component, Input, Output, EventEmitter, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SolicitudData } from '../create-form/create-form';
import { Usuario } from '../../../interfaces/common.interfaces';
import { ConfirmationModal, ConfirmationModalData } from '../../../shared/confirmation-modal/confirmation-modal';

export interface AprobadorState {
  usuarioId: string;
  estado: 'Enviado' | 'Pendiente' | 'Aprobado' | 'Rechazado' | 'Cancelado';
  fechaAccion?: Date;
  comentario?: string;
  metadata?: {
    orden?: number;
    noUsuarioId?: number;
    timestamp?: string;
  };
}
export interface AprobadorTabla {
  usuarioId: string;
  nombresApellidos: string;
  correo: string;
  area: string;
  fecha: Date;
  estado: 'Enviado' | 'Aprobado' | 'Rechazado' | 'Cancelado' | 'Pendiente';
  orden?: number;
}
export type EstadoSolicitud = 'Cancelada' | 'Aprobada' | 'Rechazada' | 'Pendiente' | 'Enviada';
export interface SuccessModalData extends SolicitudData {
  id?: string | number;
  creador: Usuario | null;
  fechaCreacion?: Date;
  estado?: EstadoSolicitud;
  approverStates?: AprobadorState[];
  // Campos adicionales para documentos
  documentoUrl?: string;
  documentoFileName?: string;
}


@Component({
  selector: 'app-request-success-modal',
  standalone: true,
  imports: [CommonModule, ConfirmationModal],
  templateUrl: './request-success-modal.html',
  styleUrls: ['./request-success-modal.css']
})
export class RequestSuccessModal implements OnChanges {
  @Input() isVisible = false;
  @Input() data: SuccessModalData | null = null;
  @Input() usuariosDisponibles: Usuario[] = [];
  @Input() isApprovalFlow = false; 

  @Output() close = new EventEmitter<void>();
  @Output() cancelRequest = new EventEmitter<{ solicitudId: string | number, comentario?: string }>();
  @Output() manageRequest = new EventEmitter<SuccessModalData>();

  approvers: AprobadorTabla[] = [];
  
  // Confirmation modal properties
  isConfirmationModalVisible = false;
  confirmationModalData: ConfirmationModalData | null = null;

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
    
    console.log('[RequestSuccessModal] Cargando aprobadores...', {
      destinatarios: this.data.destinatarios,
      usuariosDisponibles: this.usuariosDisponibles
    });
    
    this.approvers = this.data.destinatarios.map((dest) => {
      // Buscar usuario por múltiples criterios
      let usuario = this.usuariosDisponibles.find(u => u.usuario === dest.usuarioId);
      
      // Si no se encuentra por usuario, buscar por noUsuarioId
      if (!usuario && dest.noUsuarioId) {
        usuario = this.usuariosDisponibles.find(u => u.noUsuario === dest.noUsuarioId);
      }
      
      // Si aún no se encuentra, buscar por ID numérico en usuarioId
      if (!usuario && /^\d+$/.test(dest.usuarioId)) {
        const idNum = parseInt(dest.usuarioId, 10);
        usuario = this.usuariosDisponibles.find(u => u.noUsuario === idNum);
      }
      
      console.log(`[RequestSuccessModal] Destinatario ${dest.usuarioId}:`, {
        usuarioEncontrado: usuario,
        noUsuarioId: dest.noUsuarioId
      });
      
      return {
        usuarioId: dest.usuarioId,
        nombresApellidos: usuario ? `${usuario.nombres} ${usuario.apellidos}` : 'Usuario no encontrado',
        correo: usuario?.correoEmpresarial || 'correo@ejemplo.com',
        area: usuario?.cargo || 'Área no especificada',
        fecha: this.data?.fechaCreacion || new Date(),
        estado: this.getEstadoAprobador(dest.usuarioId),
        orden: dest.orden
      };
    }).sort((a, b) => (a.orden || 0) - (b.orden || 0));
    
    console.log('[RequestSuccessModal] Aprobadores cargados:', this.approvers);
  }
  
  private getEstadoAprobador(usuarioId: string): 'Enviado' | 'Aprobado' | 'Rechazado' | 'Cancelado' | 'Pendiente' {
    if (this.data?.estado === 'Cancelada') return 'Cancelado';
    const approverState = this.data?.approverStates?.find(s => s.usuarioId === usuarioId);
    if (this.data?.estado === 'Rechazada') {
        return approverState?.estado === 'Aprobado' ? 'Aprobado' : 'Rechazado';
    }
    if (approverState) {
        return approverState.estado;
    }
    if (this.data?.estado === 'Pendiente') return 'Pendiente';
    return 'Enviado';
  }

  handleMainAction(): void {
    if (this.isApprovalFlow) {
      if (this.data) {
        this.manageRequest.emit(this.data);
      }
    } else {
      this.onCancelRequest();
    }
  }

  getMainActionText(): string {
    if (this.isApprovalFlow) {
      return 'Gestionar Solicitud';
    }
    return this.data?.estado === 'Cancelada' ? 'Solicitud Cancelada' : 'Cancelar Solicitud';
  }

  canPerformMainAction(): boolean {
    if (this.isApprovalFlow) {
        const estado = this.data?.estado;
        return estado === 'Pendiente' || estado === 'Enviada';
    }
    return this.canCancelRequest();
  }

  onCancelRequest(): void {
    if (!this.data?.id) return;
    
    this.confirmationModalData = {
      title: 'Cancelar Solicitud',
      message: '¿Está seguro de que desea cancelar esta solicitud? Esta acción no se puede deshacer.',
      confirmText: 'Sí, Cancelar',
      cancelText: 'No, Mantener',
      type: 'danger',
      showComment: true,
      commentLabel: 'Motivo de cancelación (obligatorio)',
      commentPlaceholder: 'Escriba el motivo de la cancelación...',
      commentRequired: true
    };
    
    this.isConfirmationModalVisible = true;
  }

  onConfirmationModalConfirm(event: { confirmed: boolean, comment?: string }): void {
    this.isConfirmationModalVisible = false;
    
    if (event.confirmed && this.data?.id) {
      const comentario = event.comment?.trim() || ''; // Ensure it's a string
      this.cancelRequest.emit({ 
        solicitudId: this.data.id,
        comentario: comentario
      });
    }
  }

  onConfirmationModalCancel(): void {
    this.isConfirmationModalVisible = false;
  }
  
  onClose(): void { this.close.emit(); }
  
  getStatusClass(estado: string): string {
    switch (estado) {
      case 'APROBADO': case 'Aprobada': return 'text-bg-success';
      case 'RECHAZADO': case 'Rechazada': return 'text-bg-danger';
      case 'CANCELADA': case 'Cancelada': return 'text-bg-secondary';
      case 'PENDIENTE': case 'Pendiente': return 'text-bg-warning';
      default: return 'text-bg-info';
    }
  }

  canCancelRequest(): boolean {
    const estado = this.data?.estado;
    return estado !== 'Cancelada' && estado !== 'Aprobada' && estado !== 'Rechazada';
  }

  formatDate(date?: Date): string {
    if (!date) return '';
    return new Intl.DateTimeFormat('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date(date));
  }

  getDocumentName(doc?: File): string { return doc?.name || 'Documento'; }

  getCreatorInitials(): string {
    if (!this.data?.creador) return '';
    const { nombres, apellidos } = this.data.creador;
    return ((nombres?.[0] || '') + (apellidos?.[0] || '')).toUpperCase();
  }

  trackByApprover(index: number, approver: AprobadorTabla): string {
    return approver.usuarioId;
  }

  viewDocument(doc?: File) {
    if (doc && doc instanceof File && doc.size > 0) {
      try {
        const url = URL.createObjectURL(doc);
        window.open(url, '_blank');
        // Limpiar la URL después de un tiempo para liberar memoria
        setTimeout(() => URL.revokeObjectURL(url), 10000);
      } catch (error) {
        console.error('Error al crear URL del documento:', error);
        alert('Error al abrir el documento. Por favor, inténtalo de nuevo.');
      }
    } else {
      console.warn('Documento no válido para visualizar:', doc);
      alert('No se puede visualizar el documento. El archivo no es válido.');
    }
  }
}