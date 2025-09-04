import { Component, Input, Output, EventEmitter, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SolicitudData } from '../create-form/create-form';
import { Usuario } from '../../../interfaces/common.interfaces';
import { ConfirmationModal, ConfirmationModalData } from '../../approvals/confirmation-modal/confirmation-modal';
import { CommentModal, CommentModalData } from './comment-modal';

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
export interface GestionHistorial {
  id: string;
  tipo: 'ENVIO' | 'APROBACION' | 'RECHAZO' | 'CANCELACION';
  usuarioId: string;
  usuarioNombre: string;
  fecha: Date;
  comentario?: string;
  comentarioCompleto?: string;
  orden?: number;
  estadoAnterior?: string;
  estadoNuevo: string;
}

export interface SuccessModalData extends SolicitudData {
  id?: string | number;
  creador: Usuario | null;
  fechaCreacion?: Date;
  estado?: EstadoSolicitud;
  approverStates?: AprobadorState[];
  // Campos adicionales para documentos
  documentoUrl?: string;
  documentoFileName?: string;
  historialGestiones?: GestionHistorial[];
  establecerOrden: boolean;
}


@Component({
  selector: 'app-request-success-modal',
  standalone: true,
  imports: [CommonModule, ConfirmationModal, CommentModal],
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
  isCommentModalVisible = false;
  commentModalData: CommentModalData | null = null;

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
      // Usar la misma lógica de búsqueda que ApprovalService
      const findUserById = (id?: number): any => {
        if (!id) return undefined;
        
        // Buscar por noUsuario (ID numérico)
        let user = this.usuariosDisponibles.find(u => u.noUsuario === id);
        
        // Si no se encuentra, buscar por idUsuario (para usuarios resueltos)
        if (!user) {
          user = this.usuariosDisponibles.find(u => (u as any).idUsuario === id);
        }
        
        // Si no se encuentra, buscar por usuario (string)
        if (!user) {
          user = this.usuariosDisponibles.find(u => u.usuario === String(id));
        }
        
        // Si aún no se encuentra, buscar por ID en otros campos
        if (!user) {
          user = this.usuariosDisponibles.find(u => (u as any).id === id || (u as any).usuarioId === id);
        }
        
        return user;
      };
      
      // Obtener el ID numérico del destinatario
      const usuarioId = typeof dest.usuarioId === 'string' ? parseInt(dest.usuarioId, 10) : dest.usuarioId;
      const usuario = findUserById(usuarioId);
      
      return {
        usuarioId: dest.usuarioId,
        nombresApellidos: usuario ? `${usuario.nombres} ${usuario.apellidos}` : 'Usuario no encontrado',
        correo: usuario?.correoEmpresarial || 'correo@ejemplo.com',
        area: this.extractAreaString(usuario),
        fecha: this.data?.fechaCreacion || new Date(),
        estado: this.getEstadoAprobador(dest.usuarioId),
        orden: dest.orden
      };
    }).sort((a, b) => (a.orden || 0) - (b.orden || 0));
    
  }
  
  private extractAreaString(user: any): string {
    if (!user) return 'Área no especificada';
    
    // Función para extraer el valor de un campo (maneja objetos y strings)
    const extractFieldValue = (field: any, fieldName: string): string | null => {
      if (!field) return null;
      
      // Si es string, devolverlo directamente
      if (typeof field === 'string') {
        return field.trim();
      }
      
      // Si es objeto, buscar propiedades comunes
      if (typeof field === 'object') {
        // Buscar propiedades comunes en objetos de cargo/rol
        const possibleKeys = ['nombre', 'name', 'descripcion', 'description', 'titulo', 'title', 'valor', 'value'];
        
        for (const key of possibleKeys) {
          if (field[key] && typeof field[key] === 'string') {
            return field[key].trim();
          }
        }
        
        // Si no se encuentra nada, convertir el objeto a string
        return JSON.stringify(field);
      }
      
      return null;
    };

    // Función para validar si un campo es un área válida
    const isValidArea = (field: any, fieldName: string): boolean => {
      const fieldValue = extractFieldValue(field, fieldName);
      if (!fieldValue) return false;
      
      // Solo permitir campos que realmente pueden ser áreas organizacionales
      const validAreaFields = ['cargo', 'area', 'departamento', 'gerencia', 'centroCosto', 'areaTrabajo', 'sede', 'ubicacion', 'rol'];
      
      if (!validAreaFields.includes(fieldName)) {
        return false;
      }
      
      if (fieldValue.length === 0) return false;
      if (fieldValue.toLowerCase().includes('null')) return false;
      if (fieldValue.toLowerCase().includes('undefined')) return false;
      
      // Evitar campos que son solo números (como identificaciones)
      if (/^\d+$/.test(fieldValue)) return false;
      
      // Permitir cargos y roles válidos (solo letras y espacios)
      if (/^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/.test(fieldValue) && fieldValue.length < 50) {
        // Solo rechazar si parece ser un nombre personal (muy corto o muy común)
        const personalNames = ['juan', 'carlos', 'maria', 'ana', 'luis', 'pedro', 'jose', 'antonio'];
        const lowerValue = fieldValue.toLowerCase();
        
        // Si contiene palabras típicas de cargos/roles, permitirlo
        const jobKeywords = ['analista', 'desarrollador', 'administrador', 'gerente', 'director', 'coordinador', 'supervisor', 'asistente', 'especialista', 'consultor', 'ingeniero', 'arquitecto', 'diseñador', 'programador', 'soporte', 'ventas', 'marketing', 'recursos', 'humanos', 'finanzas', 'contabilidad', 'operaciones', 'logistica', 'calidad', 'seguridad', 'sistemas', 'tecnologia', 'informatica'];
        
        if (jobKeywords.some(keyword => lowerValue.includes(keyword))) {
          return true; // Es un cargo/rol válido
        }
        
        // Si es muy corto y parece nombre personal, rechazarlo
        if (fieldValue.length < 10 && personalNames.some(name => lowerValue.includes(name))) {
          return false;
        }
        
        // Para otros casos, permitir (podría ser un cargo válido)
        return true;
      }
      
      // Evitar campos que parecen correos
      if (/@/.test(fieldValue)) return false;
      
      // Evitar campos que parecen teléfonos
      if (/^\d+[\s\-\(\)]*\d+/.test(fieldValue)) return false;
      
      // Evitar campos que parecen direcciones
      const addressPatterns = [
        /calle\s+\d+/i,
        /carrera\s+\d+/i,
        /avenida\s+\d+/i,
        /#\d+/i,
        /\d+\s*-\s*\d+/i,
        /barrio/i,
        /sector/i,
        /manzana/i,
        /lote/i
      ];
      
      return !addressPatterns.some(pattern => pattern.test(fieldValue));
    };
    
    // Buscar en TODOS los campos del usuario, no solo los predefinidos
    let area = null;
    
    // Primero buscar en campos específicos de área, luego cargo como respaldo
    const areaFields = ['area', 'departamento', 'gerencia', 'centroCosto', 'areaTrabajo', 'sede', 'ubicacion'];
    const jobFields = ['cargo', 'rol'];
    const allFields = Object.keys(user);
    
    // Primero buscar en campos específicos de área
    for (const fieldName of areaFields) {
      const fieldValue = user[fieldName];
      const extractedValue = extractFieldValue(fieldValue, fieldName);
      
      if (extractedValue && isValidArea(fieldValue, fieldName)) {
        area = extractedValue;
        break;
      }
    }
    
    // Si no se encuentra área específica, usar cargo como área
    if (!area) {
      for (const fieldName of jobFields) {
        const fieldValue = user[fieldName];
        const extractedValue = extractFieldValue(fieldValue, fieldName);
        
        if (extractedValue && isValidArea(fieldValue, fieldName)) {
          area = extractedValue;
          break;
        }
      }
    }
    
    // Si no se encuentra en campos conocidos, buscar en TODOS los campos
    if (!area) {
      for (const fieldName of allFields) {
        const fieldValue = user[fieldName];
        const extractedValue = extractFieldValue(fieldValue, fieldName);
        if (extractedValue && isValidArea(fieldValue, fieldName)) {
          area = extractedValue;
          break;
        }
      }
    }
    
    // Si aún no se encuentra, usar campos que podrían ser útiles como área
    if (!area) {
      const fallbackFields = ['cargo', 'rol', 'estado'];
      for (const fieldName of fallbackFields) {
        const fieldValue = user[fieldName];
        const extractedValue = extractFieldValue(fieldValue, fieldName);
        if (extractedValue && extractedValue.length > 0) {
          // Para campos de respaldo, ser más permisivo
          if (!extractedValue.toLowerCase().includes('null') && !extractedValue.toLowerCase().includes('undefined')) {
            area = extractedValue;
            break;
          }
        }
      }
    }
    
    // Si aún no se encuentra nada, usar "Sin área especificada"
    if (!area) {
      area = 'Sin área especificada';
    }
    
    return area ? area.trim() : 'Área no especificada';
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

  shouldShowOrderColumn(): boolean {
    return this.data?.establecerOrden === true;
  }

  hasHistorialGestiones(): boolean {
    return !!(this.data?.historialGestiones && this.data.historialGestiones.length > 0);
  }

  getHistorialGestiones(): any[] {
    return this.data?.historialGestiones || [];
  }

  trackByGestion(index: number, gestion: GestionHistorial): string {
    return gestion.id;
  }

  getGestionTypeClass(tipo: string): string {
    switch (tipo) {
      case 'APROBACION': return 'historial-item-aprobacion';
      case 'RECHAZO': return 'historial-item-rechazo';
      case 'CANCELACION': return 'historial-item-cancelacion';
      case 'ENVIO': return 'historial-item-envio';
      default: return 'historial-item-default';
    }
  }

  getGestionTypeIcon(tipo: string): string {
    switch (tipo) {
      case 'APROBACION': return 'bi-check-circle-fill';
      case 'RECHAZO': return 'bi-x-circle-fill';
      case 'CANCELACION': return 'bi-dash-circle-fill';
      case 'ENVIO': return 'bi-send-fill';
      default: return 'bi-info-circle-fill';
    }
  }

  showCommentModal(gestion: GestionHistorial): void {
    this.commentModalData = {
      titulo: `Comentario - ${gestion.tipo}`,
      comentario: gestion.comentarioCompleto || gestion.comentario || 'Sin comentarios',
      usuario: gestion.usuarioNombre,
      fecha: gestion.fecha,
      tipo: gestion.tipo
    };
    this.isCommentModalVisible = true;
  }

  onCommentModalClose(): void {
    this.isCommentModalVisible = false;
    this.commentModalData = null;
  }

  getCommentPreview(comentario: string | undefined): string {
    if (!comentario) return 'Sin comentarios';
    return comentario.length > 100 ? comentario.substring(0, 100) + '...' : comentario;
  }

  viewDocument(doc?: File) {
    if (doc && doc instanceof File && doc.size > 0) {
      try {
        const url = URL.createObjectURL(doc);
        window.open(url, '_blank');
        // Limpiar la URL después de un tiempo para liberar memoria
        setTimeout(() => URL.revokeObjectURL(url), 10000);
      } catch (error) {
        alert('Error al abrir el documento. Por favor, inténtalo de nuevo.');
      }
    } else {
      alert('No se puede visualizar el documento. El archivo no es válido.');
    }
  }
}