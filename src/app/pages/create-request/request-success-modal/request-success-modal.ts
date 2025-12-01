import { Component, Input, Output, EventEmitter, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SolicitudData } from '../create-form/create-form';
import { Usuario, UsuarioData } from '../../../interfaces/common.interfaces';
import { ConfirmationModal, ConfirmationModalData } from '../../approvals/confirmation-modal/confirmation-modal';
import { CommentModal, CommentModalData } from './comment-modal';
import { ApprovalService } from '../../../services/approval.service';
import { PasswordModal } from '../../users/password-modal/password-modal';

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
export type EstadoSolicitud = 'Cancelada' | 'Aprobada' | 'Rechazada' | 'Pendiente' | 'Enviada' | 'APROB-PENDIENTE' | 'APROB-POCESADO';
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
  prioridad?: boolean;  // true = prioritaria, false/null = normal
  tipologia: string;
  enviarRecordatorio?: number;  // días entre recordatorios (0 = sin recordatorios)
  documentosAnexos: boolean;
  establecerOrden: boolean;
  destinatarios: DestinatarioData[];
  documentoAprobacion?: File;
  anexos?: File[];
  documentoUrl?: string;
  documentoFileName?: string;
  creador: Usuario | null;
  fechaCreacion?: Date;
  estado?: EstadoSolicitud;
  approverStates?: AprobadorState[];
  historialGestiones?: GestionHistorial[];
  destinatariosTotal?: number;
  destinatariosAprobados?: number;
  pdfOriginalName?: string;
  pdfSizeBytes?: number;
  adjuntos?: any[];
  ordenFirma?: boolean;
  requiereProceso?: boolean;
}


export interface ProcessUpdatePayload {
  requestId?: string | number;
  comment: string;
  attachments: File[];
  password: string;
  procesadores?: number[]; // IDs de usuarios procesadores
}

@Component({
  selector: 'app-request-success-modal',
  standalone: true,
  imports: [CommonModule, FormsModule, ConfirmationModal, CommentModal, PasswordModal],
  templateUrl: './request-success-modal.html',
  styleUrls: ['./request-success-modal.css']
})
export class RequestSuccessModal implements OnChanges {
  @Input() isVisible = false;
  @Input() data: SuccessModalData | null = null;
  @Input() usuariosDisponibles: Usuario[] = [];
  @Input() isApprovalFlow = false;
  @Input() hideManageButton = false;
  @Input() hideViewDocumentButton = false;
  @Input() currentUser: UsuarioData | null = null;
  @Input() enableProcessUpdate = false;
  @Input() hideAssignProcessors = false; // Controla si se muestra la sección de asignación de procesadores

  @Output() close = new EventEmitter<void>();
  @Output() cancelRequest = new EventEmitter<{ solicitudId: string | number, comentario?: string }>();
  @Output() manageRequest = new EventEmitter<SuccessModalData>();
  @Output() viewApprovedDocument = new EventEmitter<SuccessModalData>();
  @Output() processUpdate = new EventEmitter<ProcessUpdatePayload>();

  approvers: AprobadorTabla[] = [];

  // Confirmation modal properties
  isConfirmationModalVisible = false;
  confirmationModalData: ConfirmationModalData | null = null;
  isCommentModalVisible = false;
  commentModalData: CommentModalData | null = null;
  isPasswordModalVisible = false;
  passwordModalError = '';

  // Adjuntos properties
  attachments: any[] = [];
  isLoadingAttachments = false;

  processUpdateComment = '';
  processUpdateAttachments: File[] = [];

  // Propiedades para asignación de proceso post-aprobación
  procesadores: Array<{ usuario: Usuario | null, searchTerm: string, originalSearchTerm: string, orden: number }> = [];
  filteredProcesadores: Usuario[] = [];
  activeProcesadorIndex: number | null = null;
  highlightedProcesadorIndex: number = -1;
  procesadorDropdownStyle: any = {};

  constructor(private approvalService: ApprovalService) {}

  ngOnChanges(changes: SimpleChanges): void {
    if ((changes['data'] || changes['usuariosDisponibles']) && this.data) {
      this.loadApprovers();
      // Inicializar procesadores si la solicitud está en estado APROB-PENDIENTE y requiere proceso
      if (this.isAprobPendiente() && this.data.requiereProceso === true && this.procesadores.length === 0) {
        this.procesadores = [{ usuario: null, searchTerm: '', originalSearchTerm: '', orden: 1 }];
      }
    }
  }

  get hasProcessUpdateData(): boolean {
    return this.processUpdateComment.trim().length > 0 || this.processUpdateAttachments.length > 0;
  }

  canSubmitProcessUpdate(): boolean {
    if (!this.enableProcessUpdate || !this.data?.id) {
      return false;
    }
    return this.hasProcessUpdateData;
  }

  onProcessAttachmentClick(input: HTMLInputElement): void {
    if (!this.enableProcessUpdate) return;
    input.click();
  }

  onProcessAttachmentsSelected(event: Event): void {
    if (!this.enableProcessUpdate) return;
    const target = event.target as HTMLInputElement;
    const files = target.files ? Array.from(target.files) : [];
    this.processUpdateAttachments = files;
    if (target) {
      target.value = '';
    }
  }

  removeProcessAttachment(index: number): void {
    if (index >= 0 && index < this.processUpdateAttachments.length) {
      this.processUpdateAttachments = this.processUpdateAttachments.filter((_, i) => i !== index);
    }
  }

  onProcessUpdateClick(input?: HTMLInputElement): void {
    if (!this.canSubmitProcessUpdate()) return;
    this.passwordModalError = '';
    this.isPasswordModalVisible = true;
  }

  handlePasswordModalClose(): void {
    this.isPasswordModalVisible = false;
  }

  handlePasswordValidated(password: string): void {
    this.isPasswordModalVisible = false;
    this.processUpdate.emit({
      requestId: this.data?.id,
      comment: this.processUpdateComment.trim(),
      attachments: [...this.processUpdateAttachments],
      password
    });
    this.resetProcessUpdateForm();
  }

  handlePasswordValidationError(message: string): void {
    this.passwordModalError = message;
  }

  private resetProcessUpdateForm(): void {
    this.processUpdateComment = '';
    this.processUpdateAttachments = [];
  }

  private loadApprovers(): void {
    if (!this.data?.destinatarios || this.usuariosDisponibles.length === 0) {
      this.approvers = [];
      return;
    }

    // Mapear destinatarios y asignar orden secuencial
    const mappedApprovers = this.data.destinatarios.map((dest: DestinatarioData, index: number) => {
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
        fecha: dest.fechaDecision ? new Date(dest.fechaDecision) : null,
        estado: estadoAprobador,
        orden: index + 1
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
        const personalNames = ['juan', 'carlos', 'maria', 'ana', 'luis', 'pedro', 'jose', 'antonio'];
        const lowerValue = fieldValue.toLowerCase();

        // Si contiene palabras típicas de cargos/roles, permitirlo
        const jobKeywords = ['analista', 'desarrollador', 'administrador', 'gerente', 'director', 'coordinador', 'supervisor', 'asistente', 'especialista', 'consultor', 'ingeniero', 'arquitecto', 'diseñador', 'programador', 'soporte', 'ventas', 'marketing', 'recursos', 'humanos', 'finanzas', 'contabilidad', 'operaciones', 'logistica', 'calidad', 'seguridad', 'sistemas', 'tecnologia', 'informatica'];

        if (jobKeywords.some(keyword => lowerValue.includes(keyword))) {
          return true;
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
      const comentario = event.comment?.trim() || '';
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
    return (index || 0) + 1;
  }

  isApproved(): boolean {
    return this.data?.estado === 'Aprobada';
  }

  isAprobPendiente(): boolean {
    // Verificar si el estado es APROB-PENDIENTE
    const estado = this.data?.estado;
    if (!estado) return false;
    
    const estadoUpper = String(estado).toUpperCase().trim();
    return estadoUpper === 'APROB-PENDIENTE' || estadoUpper === 'APROB_PENDIENTE';
  }

  getEstadoDisplayName(estado?: string): string {
    if (!estado) return 'Pendiente';
    
    const estadoUpper = String(estado).toUpperCase().trim();
    if (estadoUpper === 'APROB-PENDIENTE' || estadoUpper === 'APROB_PENDIENTE') return 'Aprobado - Pendiente';
    if (estadoUpper === 'APROB-POCESADO' || estadoUpper === 'APROB_POCESADO' || estadoUpper === 'APROB-PROCESADO') return 'Aprobado - Procesado';
    if (estadoUpper === 'APROBADO' || estado === 'Aprobada') return 'Aprobada';
    if (estadoUpper === 'RECHAZADO' || estado === 'Rechazada') return 'Rechazada';
    if (estadoUpper === 'CANCELADA' || estado === 'Cancelada') return 'Cancelada';
    if (estadoUpper === 'PENDIENTE' || estado === 'Pendiente') return 'Pendiente';
    if (estadoUpper === 'ENVIADA' || estado === 'Enviada') return 'Enviada';
    
    return estado;
  }

  isRejected(): boolean {
    return this.data?.estado === 'Rechazada';
  }

  isCancelled(): boolean {
    return this.data?.estado === 'Cancelada';
  }

  isCancelledOrRejected(): boolean {
    return this.data?.estado === 'Cancelada' || this.data?.estado === 'Rechazada';
  }

  hasDocument(): boolean {
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
    return !!(this.data?.adjuntos && this.data.adjuntos.length > 0) ||
           !!this.data?.documentosAnexos ||
           !!(this.data?.anexos && this.data.anexos.length > 0);
  }

  hasOnlyAnexos(): boolean {
    return !this.hasMainDocument() &&
           !!(this.data?.anexos && this.data.anexos.length > 0);
  }

  hasAttachments(): boolean {
    return !!(this.data?.adjuntos && this.data.adjuntos.length > 0) ||
           !!this.data?.documentosAnexos ||
           !!(this.data?.anexos && this.data.anexos.length > 0);
  }

  getMainDocumentName(): string {
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
    this.handleAttachmentsDownload();
  }

  private handleAttachmentsDownload(): void {
    if (!this.data?.id || !this.currentUser?.idUsuario) {
      alert('No se puede acceder a los adjuntos. Usuario no disponible.');
      return;
    }

    this.isLoadingAttachments = true;

    // Primero listar los adjuntos
    this.approvalService.getAttachments(this.data.id, this.currentUser.idUsuario).subscribe({
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
        alert('Error al cargar los adjuntos. Por favor, inténtelo de nuevo.');
      }
    });
  }

  private findMainAttachment(attachments: any[]): any {
    return attachments.find(att =>
      att.originalName?.toLowerCase().includes('principal') ||
      att.originalName?.toLowerCase().includes('documento') ||
      att.mime === 'application/pdf'
    ) || attachments[0];
  }

  private downloadAttachment(attachment: any): void {
    if (!this.data?.id || !this.currentUser?.idUsuario) {
      return;
    }

    this.approvalService.downloadAttachment(this.data.id, attachment.id, this.currentUser.idUsuario).subscribe({
      next: (blob) => {
        // 1. Descargar el adjunto
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = attachment.originalName || `adjunto_${attachment.id}.pdf`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);

        // 2. Registrar la descarga de adjuntos
        if (this.data?.id && this.currentUser?.idUsuario) {
          this.approvalService.registrarDescargaAdjuntos(this.data.id, this.currentUser.idUsuario).subscribe({
            next: () => console.log('✅ Descarga de adjuntos registrada exitosamente'),
            error: (err) => console.warn('⚠️ No se pudo registrar la descarga de adjuntos (no afecta al usuario):', err)
          });
        }
      },
      error: (error) => {
        alert('Error al descargar el adjunto. Por favor, inténtelo de nuevo.');
      }
    });
  }

  /**
   * Descarga el archivo ZIP completo de la solicitud
   */
  downloadCompletoZip(): void {
    if (!this.data?.id || !this.currentUser?.idUsuario) {
      alert('No se puede descargar el archivo ZIP. Usuario no disponible.');
      return;
    }

    this.approvalService.downloadCompletoZip(this.data.id, this.currentUser.idUsuario).subscribe({
      next: (blob) => {
        // 1. Descargar el ZIP
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `solicitud_${this.data!.id}_completa.zip`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);

        // 2. Registrar la descarga completa
        if (this.data?.id && this.currentUser?.idUsuario) {
          this.approvalService.registrarDescargaCompleta(this.data.id, this.currentUser.idUsuario).subscribe({
            next: () => console.log('✅ Descarga completa (ZIP) registrada exitosamente'),
            error: (err) => console.warn('⚠️ No se pudo registrar la descarga completa (no afecta al usuario):', err)
          });
        }
      },
      error: (error) => {
        alert('Error al descargar el archivo ZIP. Por favor, inténtelo de nuevo.');
      }
    });
  }

  /**
   * Verifica si la solicitud está en un estado que permite descarga ZIP
   */
  canDownloadZip(): boolean {
    const estado = this.data?.estado;
    return estado === 'Aprobada' || estado === 'Rechazada' || estado === 'Cancelada';
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
      case 'DESCARGA': return 'historial-item-descarga';
      default: return 'historial-item-default';
    }
  }

  getGestionTypeIcon(tipo: string): string {
    switch (tipo) {
      case 'APROBACION': return 'bi-check-circle-fill';
      case 'RECHAZO': return 'bi-x-circle-fill';
      case 'CANCELACION': return 'bi-dash-circle-fill';
      case 'ENVIO': return 'bi-send-fill';
      case 'DESCARGA': return 'bi-file-earmark-arrow-down';
      default: return 'bi-info-circle-fill';
    }
  }

  getStatusBadgeClass(estado: string): string {
    if (!estado) return '';
    
    const estadoLower = estado.toLowerCase();
    if (estadoLower.includes('aprobado') || estadoLower === 'approved') return 'status-aprobado';
    if (estadoLower.includes('rechazado') || estadoLower === 'rejected') return 'status-rechazado';
    if (estadoLower.includes('cancelado') || estadoLower === 'cancelled' || estadoLower.includes('cancelada')) return 'status-cancelado';
    if (estadoLower.includes('pendiente') || estadoLower === 'pending') return 'status-pendiente';
    
    return '';
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

    if (this.data?.estado !== 'Cancelada') {
      return null;
    }

    // Buscar en el historial de gestiones
    if (this.data?.historialGestiones && this.data.historialGestiones.length > 0) {
      const cancelacion = this.data.historialGestiones.find(gestion =>
        gestion.tipo === 'CANCELACION' ||
        (gestion as any).accion === 'CANCELAR' ||
        (gestion as any).accion === 'CANCELACION'
      );


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

      const cancelacion = historialRaw.find((item: any) =>
        item.accion === 'CANCELAR' ||
        item.accion === 'CANCELACION' ||
        item.tipo === 'CANCELAR' ||
        item.tipo === 'CANCELACION'
      );


      if (cancelacion) {
        return {
          fecha: new Date(cancelacion.fecha),
          comentario: cancelacion.comentario || 'Sin motivo especificado'
        };
      }
    }

    const fechaCancelacion = (this.data as any)?.fechaCancelacion || (this.data as any)?.fechaActualizacion || this.data?.fechaCreacion;
    const comentarioCancelacion = (this.data as any)?.comentarioCancelacion || (this.data as any)?.motivoCancelacion;

    if (fechaCancelacion) {
      return {
        fecha: new Date(fechaCancelacion),
        comentario: comentarioCancelacion || 'Solicitud cancelada'
      };
    }

    return null;
  }

  getRejectionInfo(): { fecha: Date, comentario: string } | null {
    if (this.data?.estado !== 'Rechazada') {
      return null;
    }

    // Buscar en el historial de gestiones
    if (this.data?.historialGestiones && this.data.historialGestiones.length > 0) {
      const rechazo = this.data.historialGestiones.find(gestion =>
        gestion.tipo === 'RECHAZO' ||
        (gestion as any).accion === 'RECHAZAR' ||
        (gestion as any).accion === 'RECHAZO'
      );

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
      const rechazo = historialRaw.find((item: any) =>
        item.accion === 'RECHAZAR' ||
        item.accion === 'RECHAZO' ||
        item.tipo === 'RECHAZAR' ||
        item.tipo === 'RECHAZO'
      );

      if (rechazo) {
        return {
          fecha: new Date(rechazo.fecha),
          comentario: rechazo.comentario || 'Sin motivo especificado'
        };
      }
    }

    // Fallback: Si no hay historial pero está rechazada, mostrar información básica

    // Buscar información de rechazo en otros campos de la solicitud
    const fechaRechazo = (this.data as any)?.fechaRechazo || (this.data as any)?.fechaActualizacion || this.data?.fechaCreacion;
    const comentarioRechazo = (this.data as any)?.comentarioRechazo || (this.data as any)?.motivoRechazo;

    if (fechaRechazo) {
      return {
        fecha: new Date(fechaRechazo),
        comentario: comentarioRechazo || 'Solicitud rechazada'
      };
    }

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
        tipo: 'ENVIO'
      };
      this.isCommentModalVisible = true;
    }
  }

  viewDocument(doc?: File) {
    if (doc && doc instanceof File && doc.size > 0) {
      try {
        const url = URL.createObjectURL(doc);
        window.open(url, '_blank');
        setTimeout(() => URL.revokeObjectURL(url), 10000);
      } catch (error) {
        alert('Error al abrir el documento. Por favor, inténtalo de nuevo.');
      }
    } else {
      alert('No se puede visualizar el documento. El archivo no es válido.');
    }
  }

  // ========== MÉTODOS PARA ASIGNACIÓN DE PROCESO POST-APROBACIÓN ==========

  private getUserId(user: Usuario | null): number | null {
    if (!user) return null;
    if ('noUsuario' in user && user.noUsuario) return user.noUsuario;
    if ('idUsuario' in user && user.idUsuario) return user.idUsuario;
    return null;
  }

  onSearchProcesador(event: Event, index: number, inputElement: HTMLInputElement): void {
    const searchTerm = (event.target as HTMLInputElement).value.toLowerCase();
    this.procesadores[index].searchTerm = searchTerm;
    this.procesadores[index].originalSearchTerm = searchTerm;
    this.activeProcesadorIndex = index;
    this.highlightedProcesadorIndex = -1;

    this.filteredProcesadores = this.filterProcesadoresLocally(searchTerm, index);

    if (this.filteredProcesadores.length > 0) {
      this.calculateProcesadorDropdownPosition(inputElement);
    }
  }

  private filterProcesadoresLocally(searchTerm: string, currentIndex: number): Usuario[] {
    if (!searchTerm || searchTerm.length <= 1) return [];
    if (!this.usuariosDisponibles || this.usuariosDisponibles.length === 0) return [];

    const selectedUserIds = this.procesadores
      .map((p, i) => i !== currentIndex && p.usuario ? this.getUserId(p.usuario) : null)
      .filter(id => id != null) as number[];

    const searchTermLower = searchTerm.toLowerCase();

    // Permitir autoasignación - no excluir al usuario actual
    return this.usuariosDisponibles.filter(user => {
      const userId = this.getUserId(user);
      const matchesSearch = user.nombres?.toLowerCase().includes(searchTermLower) ||
                           user.apellidos?.toLowerCase().includes(searchTermLower) ||
                           user.usuario?.toLowerCase().includes(searchTermLower);

      if (!matchesSearch) return false;
      // Solo excluir si ya está seleccionado en otro campo
      if (userId && selectedUserIds.includes(userId)) return false;

      return true;
    });
  }

  calculateProcesadorDropdownPosition(inputElement: HTMLInputElement): void {
    const rect = inputElement.getBoundingClientRect();
  }

  onSearchProcesadorKeydown(event: KeyboardEvent, index: number): void {
    if (this.filteredProcesadores.length === 0) return;

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      this.highlightedProcesadorIndex = (this.highlightedProcesadorIndex + 1) % this.filteredProcesadores.length;
      this.updateProcesadorSearchTermWithHighlighted(index);
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      this.highlightedProcesadorIndex = (this.highlightedProcesadorIndex - 1 + this.filteredProcesadores.length) % this.filteredProcesadores.length;
      this.updateProcesadorSearchTermWithHighlighted(index);
    } else if (event.key === 'Enter') {
      event.preventDefault();
      if (this.highlightedProcesadorIndex > -1) {
        this.selectProcesador(this.filteredProcesadores[this.highlightedProcesadorIndex], index);
      }
    } else if (event.key === 'Escape') {
      this.closeProcesadorDropdown();
    }
  }

  private updateProcesadorSearchTermWithHighlighted(index: number): void {
    if (this.highlightedProcesadorIndex > -1) {
      const highlightedUser = this.filteredProcesadores[this.highlightedProcesadorIndex];
      this.procesadores[index].searchTerm = `${highlightedUser.nombres} ${highlightedUser.apellidos} (${highlightedUser.usuario})`;
    }
  }

  selectProcesador(user: Usuario, index: number): void {
    const userId = this.getUserId(user);
    const isAlreadySelected = this.procesadores.some((p, i) =>
      i !== index && p.usuario && this.getUserId(p.usuario) === userId
    );

    if (isAlreadySelected) {
      alert('Este usuario ya está seleccionado como procesador');
      return;
    }

    this.procesadores[index].usuario = user;
    this.procesadores[index].searchTerm = `${user.nombres} ${user.apellidos}`;
    this.procesadores[index].originalSearchTerm = `${user.nombres} ${user.apellidos}`;
    this.filteredProcesadores = [];
    this.activeProcesadorIndex = null;
    this.highlightedProcesadorIndex = -1;

    if (index === this.procesadores.length - 1) {
      this.agregarProcesador();
    }
  }

  agregarProcesador(): void {
    const nuevoOrden = this.procesadores.length + 1;
    this.procesadores.push({ usuario: null, searchTerm: '', originalSearchTerm: '', orden: nuevoOrden });
  }

  eliminarProcesador(index: number): void {
    if (this.procesadores.length > 1) {
      this.procesadores.splice(index, 1);
      // Recalcular órdenes después de eliminar
      this.procesadores.forEach((p, i) => {
        p.orden = i + 1;
      });
    }
  }

  closeProcesadorDropdown(): void {
    if (this.activeProcesadorIndex !== null) {
      const procesador = this.procesadores[this.activeProcesadorIndex];
      if (procesador && !procesador.usuario) {
        procesador.searchTerm = procesador.originalSearchTerm || '';
      }
    }
    this.activeProcesadorIndex = null;
    this.filteredProcesadores = [];
    this.highlightedProcesadorIndex = -1;
  }

  canAssignProcess(): boolean {
    // Debe tener al menos un procesador seleccionado
    const hasProcesadores = this.procesadores.some(p => p.usuario !== null);
    return hasProcesadores && !!this.data?.id;
  }

  onAssignProcess(): void {
    // Obtener IDs de procesadores seleccionados (en orden)
    const procesadorIds = this.procesadores
      .filter(p => p.usuario !== null)
      .sort((a, b) => a.orden - b.orden) // Asegurar orden correcto
      .map(p => this.getUserId(p.usuario))
      .filter(id => id !== null) as number[];

    if (procesadorIds.length === 0) {
      alert('Debe seleccionar al menos un procesador');
      return;
    }

    // Emitir evento para asignar proceso
    this.processUpdate.emit({
      requestId: this.data?.id,
      comment: '', // Ya no se requiere comentario
      attachments: [], // Ya no se requieren documentos
      password: '',
      procesadores: procesadorIds
    });

    // Limpiar formulario después de asignar
    this.resetPostApprovalForm();
  }

  private resetPostApprovalForm(): void {
    this.procesadores = [{ usuario: null, searchTerm: '', originalSearchTerm: '', orden: 1 }];
  }
}
