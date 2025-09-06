import { Component, Input, Output, EventEmitter, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SolicitudData } from '../create-form/create-form';
import { Usuario } from '../../../interfaces/common.interfaces';
import { ConfirmationModal, ConfirmationModalData } from '../../approvals/confirmation-modal/confirmation-modal';
import { CommentModal, CommentModalData } from './comment-modal';
import { ApprovalService } from '../../../services/approval.service';

export interface AprobadorState {
  usuarioId: string;
  estado: 'APROBADO' | 'RECHAZADO' | 'PENDIENTE' | 'CANCELADA';
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
  fecha: Date | null;
  estado: 'APROBADO' | 'RECHAZADO' | 'PENDIENTE' | 'CANCELADA';
  orden?: number;
}

export interface DestinatarioData {
  usuarioId: string;
  noUsuarioId?: number;
  orden?: number;
  ordenIndex?: number;
  estado?: string;
  decision?: string;
  nombre?: string;
  fechaDecision?: string;
  comentario?: string;
}
export type EstadoSolicitud = 'Cancelada' | 'Aprobada' | 'Rechazada' | 'Pendiente' | 'Enviada';
export interface GestionHistorial {
  id: string;
  tipo: 'ENVIO' | 'APROBACION' | 'RECHAZO' | 'CANCELACION' | 'COMENTARIO';
  usuarioId: string;
  usuarioNombre: string;
  fecha: Date;
  comentario?: string;
  comentarioCompleto?: string;
  orden?: number;
  estadoAnterior?: string;
  estadoNuevo: string;
}

export interface SuccessModalData {
  id?: string | number;
  nombreSolicitud: string;
  detallesAdicionales: string;
  prioridad: 'NORMAL' | 'IMPORTANTE';
  tipologia: string;
  enviarRecordatorio: 'NUNCA' | 'SEMANALMENTE' | 'CADA_3_DIAS' | 'TODOS_LOS_DIAS';
  documentosAnexos: boolean;
  establecerOrden: boolean;
  destinatarios: DestinatarioData[];
  documentoAprobacion?: File;
  anexos?: File[];
  // Campos adicionales para documentos
  documentoUrl?: string;
  documentoFileName?: string;
  // Campos del modal
  creador: Usuario | null;
  fechaCreacion?: Date;
  estado?: EstadoSolicitud;
  approverStates?: AprobadorState[];
  historialGestiones?: GestionHistorial[];
  // Campos adicionales de la API
  destinatariosTotal?: number;
  destinatariosAprobados?: number;
  pdfOriginalName?: string;
  pdfSizeBytes?: number;
  adjuntos?: any[];
  ordenFirma?: boolean;
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
  @Input() hideManageButton = false;
  @Input() hideViewDocumentButton = false; // Nuevo input para ocultar el botón de visualizar documento 
  @Input() currentUser: Usuario | null = null; // Usuario actual para las llamadas al servicio

  @Output() close = new EventEmitter<void>();
  @Output() cancelRequest = new EventEmitter<{ solicitudId: string | number, comentario?: string }>();
  @Output() manageRequest = new EventEmitter<SuccessModalData>();
  @Output() viewApprovedDocument = new EventEmitter<SuccessModalData>();

  approvers: AprobadorTabla[] = [];
  
  // Confirmation modal properties
  isConfirmationModalVisible = false;
  confirmationModalData: ConfirmationModalData | null = null;
  isCommentModalVisible = false;
  commentModalData: CommentModalData | null = null;

  // Adjuntos properties
  attachments: any[] = [];
  isLoadingAttachments = false;

  constructor(private approvalService: ApprovalService) {}

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
    
    // Mapear destinatarios y asignar orden secuencial
    const mappedApprovers = this.data.destinatarios.map((dest: DestinatarioData, index: number) => {
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
      
      // Mapear el estado correctamente según la respuesta de la API
      const estadoAprobador = this.mapEstadoFromAPI(dest.decision || dest.estado || 'PENDIENTE');
      
      return {
        usuarioId: dest.usuarioId,
        nombresApellidos: usuario ? `${usuario.nombres} ${usuario.apellidos}` : (dest.nombre || 'Usuario no encontrado'),
        correo: usuario?.correoEmpresarial || 'correo@ejemplo.com',
        area: this.extractAreaString(usuario),
        fecha: dest.fechaDecision ? new Date(dest.fechaDecision) : null, // Solo fecha de decisión real, no fecha de creación
        estado: estadoAprobador,
        orden: index + 1 // Siempre asignar orden secuencial basado en el índice
      };
    });
    
    // Los aprobadores ya están en orden secuencial por el mapeo
    this.approvers = mappedApprovers;
    
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

  private mapEstadoFromAPI(estado: string): 'APROBADO' | 'RECHAZADO' | 'PENDIENTE' | 'CANCELADA' {
    if (!estado) return 'PENDIENTE';
    
    const estadoUpper = estado.toUpperCase();
    if (estadoUpper.includes('APROBADO') || estadoUpper === 'APPROVED') return 'APROBADO';
    if (estadoUpper.includes('RECHAZADO') || estadoUpper === 'REJECTED') return 'RECHAZADO';
    if (estadoUpper.includes('CANCELADO') || estadoUpper === 'CANCELLED' || estadoUpper.includes('CANCELADA')) return 'CANCELADA';
    return 'PENDIENTE';
  }

  private getEstadoAprobador(usuarioId: string): 'APROBADO' | 'RECHAZADO' | 'PENDIENTE' | 'CANCELADA' {
    if (this.data?.estado === 'Cancelada') return 'CANCELADA';
    const approverState = this.data?.approverStates?.find(s => s.usuarioId === usuarioId);
    if (this.data?.estado === 'Rechazada') {
        return approverState?.estado === 'APROBADO' ? 'APROBADO' : 'RECHAZADO';
    }
    if (approverState) {
        return approverState.estado;
    }
    if (this.data?.estado === 'Pendiente') return 'PENDIENTE';
    return 'PENDIENTE';
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
  

  canCancelRequest(): boolean {
    const estado = this.data?.estado;
    return estado !== 'Cancelada' && estado !== 'Aprobada' && estado !== 'Rechazada';
  }

  formatDate(date?: Date | null): string {
    if (!date) return '-';
    try {
      return new Intl.DateTimeFormat('es-ES', { 
        day: '2-digit', 
        month: '2-digit', 
        year: 'numeric', 
        hour: '2-digit', 
        minute: '2-digit' 
      }).format(new Date(date));
    } catch (error) {
      return '-';
    }
  }

  getOrderNumber(orden?: number, index?: number): number {
    // Siempre usar el índice + 1 para orden secuencial
    // El índice viene del *ngFor y garantiza secuencia 1, 2, 3, 4...
    return (index || 0) + 1;
  }

  isApproved(): boolean {
    return this.data?.estado === 'Aprobada';
  }

  isCancelledOrRejected(): boolean {
    return this.data?.estado === 'Cancelada' || this.data?.estado === 'Rechazada';
  }

  hasDocument(): boolean {
    // Verificar si hay algún documento disponible (archivo, URL, o metadatos PDF)
    return !!(this.data?.documentoAprobacion || 
              this.data?.documentoUrl || 
              this.data?.pdfOriginalName ||
              (this.data?.documentosAnexos as any)?.[0] ||
              (this.data?.anexos as any)?.[0] ||
              (this.data?.adjuntos as any)?.[0] ||
              (this.data as any)?.documento ||
              (this.data as any)?.archivo ||
              (this.data as any)?.file);
  }

  hasMainDocument(): boolean {
    // El recuadro rojo es específicamente para adjuntos/anexos
    // No debe mostrar documento principal (ese va en el botón "VISUALIZAR DOCUMENTO")
    return !!(this.data?.adjuntos && this.data.adjuntos.length > 0) ||
           !!this.data?.documentosAnexos ||
           !!(this.data?.anexos && this.data.anexos.length > 0);
  }

  hasOnlyAnexos(): boolean {
    // Solo mostrar anexos si NO hay documento principal
    return !this.hasMainDocument() && 
           !!(this.data?.anexos && this.data.anexos.length > 0);
  }

  hasAttachments(): boolean {
    // Verificar si hay adjuntos disponibles para mostrar en el recuadro rojo
    return !!(this.data?.adjuntos && this.data.adjuntos.length > 0) ||
           !!this.data?.documentosAnexos ||
           !!(this.data?.anexos && this.data.anexos.length > 0);
  }

  getMainDocumentName(): string {
    // Para el recuadro rojo, siempre mostrar información de adjuntos/anexos
    if (this.data?.adjuntos && this.data.adjuntos.length > 0) {
      return `Adjunto: ${this.data.adjuntos[0].originalName || 'Documento adjunto'}`;
    }
    if (this.data?.anexos && this.data.anexos.length > 0) {
      return `Anexo: ${this.getDocumentName(this.data.anexos[0])}`;
    }
    if (this.data?.documentosAnexos) {
      return 'Documento Adjunto';
    }
    return 'Documento Adjunto';
  }

  viewMainDocument(): void {
    // El recuadro rojo siempre maneja adjuntos, no documento principal
    this.handleAttachmentsDownload();
  }

  private handleAttachmentsDownload(): void {
    if (!this.data?.id || !this.currentUser?.noUsuario) {
      alert('No se puede acceder a los adjuntos. Usuario no disponible.');
      return;
    }

    this.isLoadingAttachments = true;
    
    // Primero listar los adjuntos
    this.approvalService.getAttachments(this.data.id, this.currentUser.noUsuario).subscribe({
      next: (attachments) => {
        this.attachments = attachments;
        this.isLoadingAttachments = false;
        
        if (attachments.length === 0) {
          alert('No hay adjuntos disponibles para esta solicitud.');
          return;
        }
        
        // Si hay adjuntos, descargar el primero (o el principal si se puede identificar)
        const attachmentToDownload = this.findMainAttachment(attachments) || attachments[0];
        this.downloadAttachment(attachmentToDownload);
      },
      error: (error) => {
        this.isLoadingAttachments = false;
        console.error('Error al cargar adjuntos:', error);
        alert('Error al cargar los adjuntos. Por favor, inténtelo de nuevo.');
      }
    });
  }

  private findMainAttachment(attachments: any[]): any {
    // Buscar el adjunto principal (puede ser el primero o uno con nombre específico)
    return attachments.find(att => 
      att.originalName?.toLowerCase().includes('principal') ||
      att.originalName?.toLowerCase().includes('documento') ||
      att.mime === 'application/pdf'
    ) || attachments[0];
  }

  private downloadAttachment(attachment: any): void {
    if (!this.data?.id || !this.currentUser?.noUsuario) {
      return;
    }

    this.approvalService.downloadAttachment(this.data.id, attachment.id, this.currentUser.noUsuario).subscribe({
      next: (blob) => {
        // Crear URL del blob y descargar
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = attachment.originalName || `adjunto_${attachment.id}.pdf`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
      },
      error: (error) => {
        console.error('Error al descargar adjunto:', error);
        alert('Error al descargar el adjunto. Por favor, inténtelo de nuevo.');
      }
    });
  }

  onViewApprovedDocument(): void {
    if (this.data) {
      this.viewApprovedDocument.emit(this.data);
    }
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
    // Solo mostrar si hay gestiones válidas (ya filtradas por el servicio)
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
      tipo: gestion.tipo === 'COMENTARIO' ? 'ENVIO' : gestion.tipo as 'APROBACION' | 'RECHAZO' | 'CANCELACION' | 'ENVIO'
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

  getApproverComment(usuarioId: string): string {
    if (!this.data?.destinatarios) return '';
    
    const destinatario = this.data.destinatarios.find((d: DestinatarioData) => d.usuarioId === usuarioId);
    return destinatario?.comentario || '';
  }

  getCancellationInfo(): { fecha: Date, comentario: string } | null {
    console.log('getCancellationInfo - Estado:', this.data?.estado);
    console.log('getCancellationInfo - Historial:', this.data?.historialGestiones);
    console.log('getCancellationInfo - Data completa:', this.data);
    
    if (this.data?.estado !== 'Cancelada') {
      console.log('getCancellationInfo - No está cancelada');
      return null;
    }

    // Buscar en el historial de gestiones
    if (this.data?.historialGestiones && this.data.historialGestiones.length > 0) {
      const cancelacion = this.data.historialGestiones.find(gestion => 
        gestion.tipo === 'CANCELACION' || 
        (gestion as any).accion === 'CANCELAR' ||
        (gestion as any).accion === 'CANCELACION'
      );

      console.log('getCancellationInfo - Cancelación en historialGestiones:', cancelacion);

      if (cancelacion) {
        return {
          fecha: cancelacion.fecha,
          comentario: cancelacion.comentario || cancelacion.comentarioCompleto || 'Sin motivo especificado'
        };
      }
    }

    // Buscar en otros campos posibles del historial
    const historialRaw = (this.data as any)?.historial || (this.data as any)?.historialAcciones || (this.data as any)?.gestiones;
    if (Array.isArray(historialRaw)) {
      console.log('getCancellationInfo - Historial raw:', historialRaw);
      
      const cancelacion = historialRaw.find((item: any) => 
        item.accion === 'CANCELAR' || 
        item.accion === 'CANCELACION' ||
        item.tipo === 'CANCELAR' ||
        item.tipo === 'CANCELACION'
      );

      console.log('getCancellationInfo - Cancelación en historial raw:', cancelacion);

      if (cancelacion) {
        return {
          fecha: new Date(cancelacion.fecha),
          comentario: cancelacion.comentario || 'Sin motivo especificado'
        };
      }
    }

    // Fallback: Si no hay historial pero está cancelada, mostrar información básica
    console.log('getCancellationInfo - No se encontró información de cancelación en historial');
    
    // Buscar información de cancelación en otros campos de la solicitud
    const fechaCancelacion = (this.data as any)?.fechaCancelacion || (this.data as any)?.fechaActualizacion || this.data?.fechaCreacion;
    const comentarioCancelacion = (this.data as any)?.comentarioCancelacion || (this.data as any)?.motivoCancelacion;
    
    if (fechaCancelacion) {
      console.log('getCancellationInfo - Usando información de fallback:', { fechaCancelacion, comentarioCancelacion });
      return {
        fecha: new Date(fechaCancelacion),
        comentario: comentarioCancelacion || 'Solicitud cancelada'
      };
    }
    
    console.log('getCancellationInfo - No se encontró información de cancelación');
    return null;
  }

  getRejectionInfo(): { fecha: Date, comentario: string } | null {
    console.log('getRejectionInfo - Estado:', this.data?.estado);
    console.log('getRejectionInfo - Historial:', this.data?.historialGestiones);
    console.log('getRejectionInfo - Data completa:', this.data);
    
    if (this.data?.estado !== 'Rechazada') {
      console.log('getRejectionInfo - No está rechazada');
      return null;
    }

    // Buscar en el historial de gestiones
    if (this.data?.historialGestiones && this.data.historialGestiones.length > 0) {
      const rechazo = this.data.historialGestiones.find(gestion => 
        gestion.tipo === 'RECHAZO' || 
        (gestion as any).accion === 'RECHAZAR' ||
        (gestion as any).accion === 'RECHAZO'
      );

      console.log('getRejectionInfo - Rechazo en historialGestiones:', rechazo);

      if (rechazo) {
        return {
          fecha: rechazo.fecha,
          comentario: rechazo.comentario || rechazo.comentarioCompleto || 'Sin motivo especificado'
        };
      }
    }

    // Buscar en otros campos posibles del historial
    const historialRaw = (this.data as any)?.historial || (this.data as any)?.historialAcciones || (this.data as any)?.gestiones;
    if (Array.isArray(historialRaw)) {
      console.log('getRejectionInfo - Historial raw:', historialRaw);
      
      const rechazo = historialRaw.find((item: any) => 
        item.accion === 'RECHAZAR' || 
        item.accion === 'RECHAZO' ||
        item.tipo === 'RECHAZAR' ||
        item.tipo === 'RECHAZO'
      );

      console.log('getRejectionInfo - Rechazo en historial raw:', rechazo);

      if (rechazo) {
        return {
          fecha: new Date(rechazo.fecha),
          comentario: rechazo.comentario || 'Sin motivo especificado'
        };
      }
    }

    // Fallback: Si no hay historial pero está rechazada, mostrar información básica
    console.log('getRejectionInfo - No se encontró información de rechazo en historial');
    
    // Buscar información de rechazo en otros campos de la solicitud
    const fechaRechazo = (this.data as any)?.fechaRechazo || (this.data as any)?.fechaActualizacion || this.data?.fechaCreacion;
    const comentarioRechazo = (this.data as any)?.comentarioRechazo || (this.data as any)?.motivoRechazo;
    
    if (fechaRechazo) {
      console.log('getRejectionInfo - Usando información de fallback:', { fechaRechazo, comentarioRechazo });
      return {
        fecha: new Date(fechaRechazo),
        comentario: comentarioRechazo || 'Solicitud rechazada'
      };
    }
    
    console.log('getRejectionInfo - No se encontró información de rechazo');
    return null;
  }

  showApproverComment(approver: AprobadorTabla): void {
    const comentario = this.getApproverComment(approver.usuarioId);
    if (comentario) {
      this.commentModalData = {
        titulo: `Comentario - ${approver.nombresApellidos}`,
        comentario: comentario,
        usuario: approver.nombresApellidos,
        fecha: approver.fecha || new Date(),
        tipo: 'ENVIO' // Using ENVIO as fallback since COMENTARIO is not in the original type
      };
      this.isCommentModalVisible = true;
    }
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