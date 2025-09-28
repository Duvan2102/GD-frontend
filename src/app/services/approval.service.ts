import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { BehaviorSubject, Observable, of, throwError, forkJoin } from 'rxjs';
import { catchError, map, tap, switchMap } from 'rxjs/operators';
import { environment } from '../environments/environment';
import { Approval } from '../pages/approvals/approvals';
import { SuccessModalData, AprobadorState, DestinatarioData } from '../pages/create-request/request-success-modal/request-success-modal';
import { Usuario } from '../interfaces/common.interfaces';
import { UserService } from './user.service';

@Injectable({
  providedIn: 'root'
})
export class ApprovalService {
  public approvalsSubject = new BehaviorSubject<Approval[]>([]);
  approvals$: Observable<Approval[]> = this.approvalsSubject.asObservable();

  private readonly baseUrl = (environment.apiUrl.endsWith('/')
    ? environment.apiUrl.slice(0, -1)
    : environment.apiUrl);

  constructor(private http: HttpClient, private userService: UserService) { }

  // Helpers
  private headersForUser(userId: number): HttpHeaders {
    return new HttpHeaders({ 'X-User-Id': String(userId) });
  }

  /**
   * Mapea el estado del aprobador a un formato estándar
   */
  private mapApproverState(estado: any): 'APROBADO' | 'RECHAZADO' | 'PENDIENTE' | 'CANCELADA' {
    if (!estado) return 'PENDIENTE';
    
    const estadoStr = String(estado).toLowerCase();
    if (estadoStr.includes('aprobado') || estadoStr === 'approved') return 'APROBADO';
    if (estadoStr.includes('rechazado') || estadoStr === 'rejected') return 'RECHAZADO';
    if (estadoStr.includes('cancelado') || estadoStr === 'cancelled' || estadoStr.includes('cancelada')) return 'CANCELADA';
    return 'PENDIENTE';
  }

  /**
   * Obtiene la fecha de acción del aprobador
   */
  private getApproverActionDate(item: any, usuarioId: string): Date {
    // Buscar en el historial de acciones
    const historial = item?.historialAcciones || item?.approvalHistory || [];
    const accion = historial.find((h: any) => 
      h.usuarioId === usuarioId || h.usuario === usuarioId
    );
    
    if (accion?.fecha) {
      return new Date(accion.fecha);
    }
    
    // Si no hay historial, usar fecha de creación como fallback
    return new Date(item?.createdAt || item?.fechaCreacion || new Date());
  }

  /**
   * Obtiene el comentario del aprobador
   */
  private getApproverComment(item: any, usuarioId: string): string {
    const historial = item?.historialAcciones || item?.approvalHistory || [];
    const accion = historial.find((h: any) => 
      h.usuarioId === usuarioId || h.usuario === usuarioId
    );
    
    return accion?.comentario || accion?.comment || '';
  }

  /**
   * Registra metadata de una acción de aprobación
   */
  recordApprovalAction(solicitudId: string, usuarioId: string, action: 'approve' | 'reject' | 'cancel', comentario?: string): Observable<any> {
    const metadata = {
      solicitudId,
      usuarioId,
      action,
      comentario,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href
    };


    // Aquí se podría enviar al backend para persistir la metadata
    // Por ahora, solo lo logueamos
    return of(metadata);
  }

  /**
   * Obtiene el historial de metadata para una solicitud
   */
  getApprovalMetadata(solicitudId: string): Observable<any[]> {
    // En una implementación real, esto vendría del backend
    // Por ahora retornamos un array vacío
    return of([]);
  }

  private mapServerToApproval(item: any): Approval {
    // Use proper ID from server, fallback to a more descriptive ID if needed
    const id = item?.id ?? item?.numeroRadicado ?? item?.solicitudId ?? `temp-${Date.now()}`;
    const estado = (item?.estado || 'PENDIENTE').toUpperCase();
    const createdAt = item?.createdAt || item?.fechaCreacion || new Date().toISOString();
    const updatedAt = item?.updatedAt || item?.fechaActualizacion || createdAt;

    // Extraer información de aprobadores únicamente del servidor
    const approvers = (item?.destinatarios || []).map((d: any) => {
      // Extraer información directamente del objeto del servidor
      const nombres = d?.nombres || (d?.nombre?.split(' ')[0] || '');
      const apellidos = d?.apellidos || (d?.nombre?.split(' ')[1] || '');

      return {
        initials: `${nombres?.[0] || ''}${apellidos?.[0] || ''}`.toUpperCase(),
        fullName: `${nombres} ${apellidos}`.trim()
      };
    });

    // Extraer información del usuario creador del response del servidor
    const creadorId = item?.createdBy || item?.creadorId || item?.idSolicitante;
    
    // Información básica del creador (sin resolver aún)
    const creatorUser = 'Usuario no encontrado';
    const creatorFullName = 'Usuario no encontrado';
    const position = 'Funcionario';

    return {
      id: String(id),
      type: String(item?.tipologiaId ?? item?.idTipologia ?? ''),
      creationDate: createdAt,
      creatorUser: creatorUser,
      creatorFullName: creatorFullName,
      position: position,
      lastUpdate: updatedAt,
      status: ['APROBADO', 'RECHAZADO', 'PENDIENTE', 'CANCELADA'].includes(estado) ? estado : 'PENDIENTE',
      approvers: approvers,
      priority: Boolean(item?.prioridad === 'IMPORTANTE' || item?.prioridad === true),
      fullData: item,
      // Agregar el ID del creador para resolver después
      _creadorId: creadorId
    } as Approval;
  }

  private extractAreaString(user: Usuario | undefined): string | null {
    if (!user) return null;
    
    // Intentar múltiples estrategias para extraer el área como string
    if (typeof user.cargo === 'string') return user.cargo;
    if (user.cargo && typeof user.cargo === 'object') {
      if ((user.cargo as any).nombre) return (user.cargo as any).nombre;
      if ((user.cargo as any).descripcion) return (user.cargo as any).descripcion;
      if ((user.cargo as any).name) return (user.cargo as any).name;
    }
    
    if ((user as any).area) {
      if (typeof (user as any).area === 'string') return (user as any).area;
      if ((user as any).area.nombre) return (user as any).area.nombre;
      if ((user as any).area.descripcion) return (user as any).area.descripcion;
      if ((user as any).area.name) return (user as any).area.name;
    }
    
    if ((user as any).departamento) {
      if (typeof (user as any).departamento === 'string') return (user as any).departamento;
      if ((user as any).departamento.nombre) return (user as any).departamento.nombre;
    }
    
    return null;
  }

  private extractRequestName(item: any, id: string | number): string {
    // Intentar múltiples estrategias para extraer el nombre de la solicitud
    if (item?.titulo && typeof item.titulo === 'string' && item.titulo.trim()) {
      return item.titulo;
    }
    if (item?.nombreSolicitud && typeof item.nombreSolicitud === 'string' && item.nombreSolicitud.trim()) {
      return item.nombreSolicitud;
    }
    if (item?.nombre && typeof item.nombre === 'string' && item.nombre.trim()) {
      return item.nombre;
    }
    if (item?.descripcion && typeof item.descripcion === 'string' && item.descripcion.trim()) {
      return item.descripcion;
    }
    if (item?.comentarioInicial && typeof item.comentarioInicial === 'string' && item.comentarioInicial.trim()) {
      return item.comentarioInicial;
    }
    if (item?.pdfOriginalName && typeof item.pdfOriginalName === 'string' && item.pdfOriginalName.trim()) {
      return item.pdfOriginalName;
    }
    if (item?.documentoFileName && typeof item.documentoFileName === 'string' && item.documentoFileName.trim()) {
      return item.documentoFileName;
    }
    if (item?.fileName && typeof item.fileName === 'string' && item.fileName.trim()) {
      return item.fileName;
    }
    
    // Si no se encuentra un nombre específico, generar uno basado en la tipología
    if (item?.tipologiaId || item?.idTipologia) {
      const tipologiaId = item.tipologiaId || item.idTipologia;
      return `Solicitud de ${tipologiaId} - ${id}`;
    }
    
    return `Solicitud ${id}`;
  }

  private extractRequestDescription(item: any): string {
    // Intentar múltiples estrategias para extraer la descripción/comentario
    if (item?.descripcionSolicitud && typeof item.descripcionSolicitud === 'string' && item.descripcionSolicitud.trim()) {
      return item.descripcionSolicitud;
    }
    if (item?.comentarioInicial && typeof item.comentarioInicial === 'string' && item.comentarioInicial.trim()) {
      return item.comentarioInicial;
    }
    if (item?.detalles && typeof item.detalles === 'string' && item.detalles.trim()) {
      return item.detalles;
    }
    if (item?.descripcion && typeof item.descripcion === 'string' && item.descripcion.trim()) {
      return item.descripcion;
    }
    if (item?.comentario && typeof item.comentario === 'string' && item.comentario.trim()) {
      return item.comentario;
    }
    if (item?.observaciones && typeof item.observaciones === 'string' && item.observaciones.trim()) {
      return item.observaciones;
    }
    if (item?.justificacion && typeof item.justificacion === 'string' && item.justificacion.trim()) {
      return item.justificacion;
    }
    if (item?.motivo && typeof item.motivo === 'string' && item.motivo.trim()) {
      return item.motivo;
    }
    
    // Buscar en otros campos posibles
    if (item?.notes && typeof item.notes === 'string' && item.notes.trim()) {
      return item.notes;
    }
    if (item?.description && typeof item.description === 'string' && item.description.trim()) {
      return item.description;
    }
    if (item?.message && typeof item.message === 'string' && item.message.trim()) {
      return item.message;
    }
    if (item?.text && typeof item.text === 'string' && item.text.trim()) {
      return item.text;
    }
    
    // Buscar cualquier campo que contenga texto y no sea un ID o fecha
    const textFields = Object.keys(item || {}).filter(key => {
      const value = item[key];
      return typeof value === 'string' && 
             value.trim() && 
             !key.toLowerCase().includes('id') && 
             !key.toLowerCase().includes('date') && 
             !key.toLowerCase().includes('time') &&
             !key.toLowerCase().includes('created') &&
             !key.toLowerCase().includes('updated') &&
             !key.toLowerCase().includes('estado') &&
             !key.toLowerCase().includes('tipologia') &&
             !key.toLowerCase().includes('nombre') &&
             !key.toLowerCase().includes('solicitud') &&
             !key.toLowerCase().includes('pdf') &&
             !key.toLowerCase().includes('file') &&
             !key.toLowerCase().includes('documento') &&
             !key.toLowerCase().includes('original') &&
             value.length > 10 &&
             !value.match(/^\d{4}-\d{2}-\d{2}/) &&
             !value.match(/^\d+$/) &&
             !value.match(/\.pdf$/i) &&
             !value.match(/\.doc$/i) &&
             !value.match(/\.docx$/i) &&
             !value.match(/\.xls$/i) &&
             !value.match(/\.xlsx$/i);
    });
    
    if (textFields.length > 0) {
      return item[textFields[0]];
    }
    
    return 'No se proporcionaron detalles adicionales para esta solicitud.';
  }

  private mapearHistorialGestiones(gestiones: any[], users: Usuario[], destinatarios?: any[]): any[] {
    
    const findUserById = (id?: number): Usuario | undefined => {
      if (!id) return undefined;
      return users.find(u => u.noUsuario === id || (u as any).idUsuario === id);
    };

    const allGestiones: any[] = [];

    // 1. Mapear gestiones del campo "historial"
    if (Array.isArray(gestiones) && gestiones.length > 0) {
      const gestionesHistorial = gestiones.map((gestion, index) => {
        const usuario = findUserById(gestion.actorUsuarioId);
        
        return {
          id: `historial-${gestion.id}`,
          tipo: this.mapearTipoGestion(gestion.accion),
          usuarioId: String(gestion.actorUsuarioId || ''),
          usuarioNombre: usuario ? `${usuario.nombres} ${usuario.apellidos}`.trim() : 'Usuario desconocido',
          fecha: new Date(gestion.fecha),
          comentario: gestion.comentario || '',
          comentarioCompleto: gestion.comentario || '',
          orden: index + 1,
          estadoAnterior: null,
          estadoNuevo: gestion.accion,
          accionOriginal: gestion.accion,
          actorUsuarioId: gestion.actorUsuarioId,
          fuente: 'historial'
        };
      });
      
      allGestiones.push(...gestionesHistorial);
    }

    // 2. Mapear gestiones de destinatarios con decisiones (evitando duplicados de cancelado/rechazado)
    if (Array.isArray(destinatarios) && destinatarios.length > 0) {
      
      const gestionesDestinatarios = destinatarios
        .filter(dest => 
          dest.decision && 
          dest.decision !== 'PENDIENTE' && 
          dest.fechaDecision !== null && 
          dest.comentario !== null
        )
        .map((dest, index) => {
          const usuario = findUserById(dest.usuarioId);
          const fechaDestinatario = new Date(dest.fechaDecision);
          const tipoDestinatario = this.mapearTipoGestion(dest.decision);
          
          // Verificar duplicados específicos para cancelado y rechazado
          const esCanceladoORechazado = tipoDestinatario === 'CANCELACION' || tipoDestinatario === 'RECHAZO';
          
          if (esCanceladoORechazado) {
            // Para cancelado/rechazado, verificar si ya existe en el historial
            const yaExisteEnHistorial = allGestiones.some(g => {
              const mismoTipo = g.tipo === tipoDestinatario;
              const mismaFecha = Math.abs(g.fecha.getTime() - fechaDestinatario.getTime()) < 300000; // 5 minutos de diferencia
              
              return mismoTipo && mismaFecha;
            });
            
            if (yaExisteEnHistorial) {
              return null;
            }
          } else {
            // Para otros tipos (APROBACION, ENVIO), verificar duplicados más estrictos
            const yaExisteEnHistorial = allGestiones.some(g => {
              const mismoUsuario = g.actorUsuarioId === dest.usuarioId;
              const mismaFecha = Math.abs(g.fecha.getTime() - fechaDestinatario.getTime()) < 60000; // 1 minuto de diferencia
              const mismoTipo = g.accionOriginal === dest.decision || g.tipo === tipoDestinatario;
              
              return mismoUsuario && (mismaFecha || mismoTipo);
            });
            
            if (yaExisteEnHistorial) {
              return null;
            }
          }
          
          return {
            id: `destinatario-${dest.usuarioId}-${index}`,
            tipo: tipoDestinatario,
            usuarioId: String(dest.usuarioId || ''),
            usuarioNombre: usuario ? `${usuario.nombres} ${usuario.apellidos}`.trim() : (dest.nombre || 'Usuario desconocido'),
            fecha: fechaDestinatario,
            comentario: dest.comentario || '',
            comentarioCompleto: dest.comentario || '',
            orden: dest.ordenIndex !== undefined ? dest.ordenIndex + 1 : (index + 1),
            estadoAnterior: 'PENDIENTE',
            estadoNuevo: dest.decision,
            accionOriginal: dest.decision,
            actorUsuarioId: dest.usuarioId,
            fuente: 'destinatarios'
          };
        })
        .filter(gestion => gestion !== null); // Filtrar nulos
      
      allGestiones.push(...gestionesDestinatarios);
    }

    // Ordenar por fecha (más reciente primero)
    const result = allGestiones.sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime());
    return result;
  }

  private mapearTipoGestion(tipo: string): 'ENVIO' | 'APROBACION' | 'RECHAZO' | 'CANCELACION' {
    if (!tipo) return 'ENVIO';
    
    const tipoUpper = tipo.toUpperCase();
    
    // Mapear acciones específicas del backend
    if (tipoUpper === 'CREAR' || tipoUpper === 'CREATE') return 'ENVIO';
    if (tipoUpper === 'CANCELAR' || tipoUpper === 'CANCEL') return 'CANCELACION';
    if (tipoUpper === 'APROBAR' || tipoUpper === 'APPROVE') return 'APROBACION';
    if (tipoUpper === 'RECHAZAR' || tipoUpper === 'REJECT') return 'RECHAZO';
    
    // Mapeos genéricos como fallback
    if (tipoUpper.includes('APROB') || tipoUpper === 'APPROVED') return 'APROBACION';
    if (tipoUpper.includes('RECHAZ') || tipoUpper === 'REJECTED') return 'RECHAZO';
    if (tipoUpper.includes('CANCEL') || tipoUpper === 'CANCELLED') return 'CANCELACION';
    if (tipoUpper.includes('ENVI') || tipoUpper === 'SEND') return 'ENVIO';
    
    // Por defecto, si no se reconoce, mantener como ENVIO
    return 'ENVIO';
  }
  
  mapToSuccessData(item: any, users: Usuario[]): SuccessModalData {
    
    const findUserById = (id?: number): Usuario | undefined => {
      if (!id) return undefined;
      
      // Buscar por noUsuario (ID numérico)
      let user = users.find(u => u.noUsuario === id);
      
      // Si no se encuentra, buscar por idUsuario (para usuarios resueltos)
      if (!user) {
        user = users.find(u => (u as any).idUsuario === id);
      }
      
      // Si no se encuentra, buscar por usuario (string)
      if (!user) {
        user = users.find(u => u.usuario === String(id));
      }
      
      // Si aún no se encuentra, buscar por ID en otros campos
      if (!user) {
        user = users.find(u => (u as any).id === id || (u as any).usuarioId === id);
      }
      
      return user;
    };
    
    const findUserByUsername = (username?: string): Usuario | undefined => {
      return users.find(u => u.usuario === username);
    };

    const id = item?.id ?? item?.numeroRadicado ?? '';
    const createdAt = item?.createdAt || item?.fechaCreacion || new Date().toISOString();
    const estadoBack = String(item?.estado || 'Pendiente');
    const estado = (() => {
      const up = estadoBack.toUpperCase();
      if (up === 'APROBADO') return 'Aprobada';
      if (up === 'RECHAZADO') return 'Rechazada';
      if (up === 'CANCELADA') return 'Cancelada';
      if (up === 'ENVIADA') return 'Enviada';
      return 'Pendiente';
    })();

    const creadorId: number | undefined = item?.creador?.noUsuario || item?.creadorId || item?.idSolicitante || item?.createdBy;
    const creadorUser: string | undefined = item?.creador?.usuario || item?.creadorUsuario;
    const creador = findUserById(creadorId) || findUserByUsername(creadorUser) || null;
    
    const destinatariosRaw: any[] = item?.destinatarios || [];
    const destinatarios: DestinatarioData[] = destinatariosRaw.map((d: any, index: number) => {
      // Mapear según la estructura real de la API: { usuarioId: 5, ordenIndex: 0, nombre: null, decision: "PENDIENTE" }
      const usuarioId = d?.usuarioId;
      let user = usuarioId ? findUserById(usuarioId) : undefined;
      
      // Usar el ordenIndex de la API o el índice como fallback
      const orden = d?.ordenIndex !== undefined ? d.ordenIndex + 1 : (index + 1);
      const estadoAprob: any = d?.decision || d?.estado || 'PENDIENTE';
      
      // Si no se encuentra el usuario en la lista local, intentar obtenerlo por ID
      if (!user && usuarioId) {
        // Nota: En este punto no podemos hacer llamadas asíncronas, 
        // pero podemos marcar que necesita ser resuelto
      }
      
      // Incluir información adicional del usuario si está disponible
      return { 
        usuarioId: String(usuarioId),
        noUsuarioId: usuarioId,
        orden, 
        ordenIndex: d?.ordenIndex,
        estado: estadoAprob,
        decision: d?.decision,
        nombre: user ? `${user.nombres} ${user.apellidos}`.trim() : d?.nombre || null,
        nombresApellidos: user ? `${user.nombres} ${user.apellidos}`.trim() : d?.nombre || null,
        correo: user?.correoEmpresarial || null,
        correoEmpresarial: user?.correoEmpresarial || null,
        area: this.extractAreaString(user),
        cargo: this.extractAreaString(user),
        fechaDecision: d?.fechaDecision,
        comentario: d?.comentario,
        needsUserResolution: !user && !!usuarioId
      };
    });

    // Mapear estados de aprobadores con metadata
    const approverStates: AprobadorState[] = destinatarios.map(dest => ({
      usuarioId: dest.usuarioId,
      estado: this.mapApproverState(dest.decision || dest.estado),
      fechaAccion: this.getApproverActionDate(item, dest.usuarioId),
      comentario: this.getApproverComment(item, dest.usuarioId),
      metadata: {
        orden: dest.ordenIndex || dest.orden,
        noUsuarioId: dest.noUsuarioId,
        timestamp: new Date().toISOString()
      }
    }));

    const result = {
      id: String(id),
      nombreSolicitud: this.extractRequestName(item, id),
      detallesAdicionales: this.extractRequestDescription(item),
      prioridad: (item?.prioridad === true || item?.prioridad === 'IMPORTANTE' ? 'IMPORTANTE' : 'NORMAL') as any,
      tipologia: String(item?.tipologiaId ?? item?.idTipologia ?? ''),
      enviarRecordatorio: 'NUNCA' as any,
      documentosAnexos: Array.isArray(item?.adjuntos) && item.adjuntos.length > 0,
      establecerOrden: Boolean(item?.ordenFirma),
      destinatarios,
      documentoAprobacion: item?.documentoAprobacion || item?.pdfPrincipal || item?.archivo,
      anexos: item?.adjuntos || item?.anexos,
      creador: creador,
      fechaCreacion: new Date(createdAt),
      estado: estado as any,
      approverStates: destinatarios.map(d => ({ usuarioId: (d as any).usuarioId, estado: (d as any).estado || 'Pendiente' })),
      // Agregar información del documento para la vista
      documentoUrl: item?.documentoUrl || item?.pdfUrl || item?.urlDocumento || item?.url || item?.documentUrl || item?.urlDocumentoOriginal,
      documentoFileName: item?.documentoFileName || item?.pdfFileName || item?.nombreArchivo || item?.fileName || item?.pdfOriginalName || item?.nombreDocumentoOriginal,
      historialGestiones: this.mapearHistorialGestiones(item?.historial || [], users, destinatarios),
      // Campos adicionales de la API
      destinatariosTotal: item?.destinatariosTotal || destinatarios.length,
      destinatariosAprobados: item?.destinatariosAprobados || 0,
      pdfOriginalName: item?.pdfOriginalName || item?.documentoFileName || item?.pdfFileName,
      pdfSizeBytes: item?.pdfSizeBytes,
      adjuntos: item?.adjuntos || [],
      ordenFirma: Boolean(item?.ordenFirma),
      // Campos adicionales para documentos aprobados
      documentoAprobado: item?.documentoAprobado || item?.documentoAprobacion,
      urlDocumentoAprobado: item?.urlDocumentoAprobado || item?.documentoAprobadoUrl,
      nombreDocumentoAprobado: item?.nombreDocumentoAprobado || item?.documentoAprobadoFileName
    };
    
    return result;
  }

  // Mutations on local cache
  addApproval(approval: Approval) {
    const currentApprovals = this.approvalsSubject.getValue();
    this.approvalsSubject.next([approval, ...currentApprovals]);
  }

  updateApproval(updatedApproval: Approval) {
    const currentApprovals = this.approvalsSubject.getValue();
    const index = currentApprovals.findIndex(a => a.id === updatedApproval.id);
    if (index > -1) {
      currentApprovals[index] = updatedApproval;
      this.approvalsSubject.next([...currentApprovals]);
    }
  }

  deleteApproval(approvalId: string | number, usuarioId: number): Observable<any> {
    const headers = this.headersForUser(usuarioId);
    return this.http.delete<any>(`${this.baseUrl}/solicitudes/${approvalId}`, { headers }).pipe(
      tap(() => {
        // Actualizar el estado local después de eliminar exitosamente
        const currentApprovals = this.approvalsSubject.getValue();
        const filteredApprovals = currentApprovals.filter(a => a.id.toString() !== approvalId.toString());
        this.approvalsSubject.next(filteredApprovals);
      }),
      catchError((error) => {
        throw error;
      })
    );
  }

  // Backend integrations
  getApprovalsByCreator(userId: number, users: Usuario[], page = 0, size = 10): Observable<Approval[]> {
    const params = new HttpParams()
      .set('creadorId', String(userId))
      .set('page', String(page))
      .set('size', String(size))
      .set('sort', 'createdAt,desc');
    return this.http.get<any>(`${this.baseUrl}/solicitudes`, { headers: this.headersForUser(userId), params }).pipe(
      map(res => {
        if (Array.isArray(res)) return res;
        const data = res?.data ?? res;
        return Array.isArray(data?.content) ? data.content : (Array.isArray(data) ? data : []);
      }),
      switchMap((list: any[]) => {
        const approvals = list.map((item: any) => this.mapServerToApproval(item));
        
        // Obtener IDs únicos de creadores que necesitan resolución
        const creatorIds = [...new Set(approvals
          .filter((approval: any) => approval._creadorId)
          .map((approval: any) => approval._creadorId!))];
        
        if (creatorIds.length === 0) {
          return of(approvals);
        }
        
        // Resolver información de usuarios creadores
        const userRequests = creatorIds.map(creatorId => 
          this.userService.obtenerUsuarioPorId(creatorId).pipe(
            catchError(() => of(null))
          )
        );
        
        return forkJoin(userRequests).pipe(
          map(resolvedUsers => {
            const userMap = new Map<number, Usuario>();
            resolvedUsers.forEach(user => {
              if (user) {
                userMap.set(user.noUsuario || (user as any).idUsuario, user);
              }
            });
            
            // Actualizar approvals con información resuelta
            return approvals.map((approval: any) => {
              if (approval._creadorId && userMap.has(approval._creadorId)) {
                const user = userMap.get(approval._creadorId)!;
                return {
                  ...approval,
                  creatorUser: user.usuario || 'Usuario no encontrado',
                  creatorFullName: `${user.nombres || ''} ${user.apellidos || ''}`.trim() || 'Usuario no encontrado',
                  position: this.extractAreaString(user) || 'Funcionario'
                };
              }
              return approval;
            });
          })
        );
      }),
      tap(list => this.approvalsSubject.next(list)),
      catchError(() => of([]))
    );
  }

  getApprovalsForApprover(userId: number, users: Usuario[], page = 0, size = 10): Observable<Approval[]> {
    const params = new HttpParams()
      .set('usuarioId', String(userId))
      .set('page', String(page))
      .set('size', String(size));
    const url = `${this.baseUrl}/solicitudes/para-gestionar`;
    return this.http.get<any>(url, { headers: this.headersForUser(userId), params }).pipe(
      map(res => {
        if (Array.isArray(res)) return res;
        const data = res?.data ?? res;
        return Array.isArray(data?.content) ? data.content : (Array.isArray(data) ? data : []);
      }),
      switchMap((list: any[]) => {
        const approvals = list.map((item: any) => this.mapServerToApproval(item));
        
        // Obtener IDs únicos de creadores que necesitan resolución
        const creatorIds = [...new Set(approvals
          .filter((approval: any) => approval._creadorId)
          .map((approval: any) => approval._creadorId!))];
        
        if (creatorIds.length === 0) {
          return of(approvals);
        }
        
        // Resolver información de usuarios creadores
        const userRequests = creatorIds.map(creatorId => 
          this.userService.obtenerUsuarioPorId(creatorId).pipe(
            catchError(() => of(null))
          )
        );
        
        return forkJoin(userRequests).pipe(
          map(resolvedUsers => {
            const userMap = new Map<number, Usuario>();
            resolvedUsers.forEach(user => {
              if (user) {
                userMap.set(user.noUsuario || (user as any).idUsuario, user);
              }
            });
            
            // Actualizar approvals con información resuelta
            return approvals.map((approval: any) => {
              if (approval._creadorId && userMap.has(approval._creadorId)) {
                const user = userMap.get(approval._creadorId)!;
                return {
                  ...approval,
                  creatorUser: user.usuario || 'Usuario no encontrado',
                  creatorFullName: `${user.nombres || ''} ${user.apellidos || ''}`.trim() || 'Usuario no encontrado',
                  position: this.extractAreaString(user) || 'Funcionario'
                };
              }
              return approval;
            });
          })
        );
      }),
      tap(list => this.approvalsSubject.next(list)),
      catchError(() => of([]))
    );
  }

  getApprovalDetails(approvalId: string | number, users: Usuario[], userId?: number): Observable<Approval | undefined> {
    const local = this.approvalsSubject.getValue().find(a => a.id.toString() === approvalId.toString());
    const headers = userId ? this.headersForUser(userId) : undefined;
    
    // Check if the ID looks like a timestamp (invalid for API calls)
    const idStr = String(approvalId);
    if (idStr.startsWith('temp-') || /^\d{13}$/.test(idStr)) {
      return of(local);
    }
    
    return this.http.get<any>(`${this.baseUrl}/solicitudes/${approvalId}`, { headers }).pipe(
      switchMap(item => {
        // Usar mapToSuccessData para obtener la estructura correcta
        const initialData = this.mapToSuccessData(item, users);
        
        // Identificar usuarios que necesitan resolución
        const usersToResolve = (initialData.destinatarios || [])
          .filter((dest: any) => dest.needsUserResolution && dest.noUsuarioId)
          .map((dest: any) => dest.noUsuarioId);
        
        if (usersToResolve.length === 0) {
          return of(this.mapSuccessDataToApproval(initialData));
        }
        
        // Obtener información de usuarios faltantes
        const userRequests = usersToResolve.map(userId => 
          this.userService.obtenerUsuarioPorId(userId).pipe(
            catchError(error => {
              return of(null);
            })
          )
        );
        
        return forkJoin(userRequests).pipe(
          map(resolvedUsers => {
            // Filtrar usuarios nulos y combinar con usuarios existentes
            const validUsers = resolvedUsers.filter(user => user !== null) as Usuario[];
            
            // Crear un mapa de usuarios para evitar duplicados
            const userMap = new Map<string, Usuario>();
            
            // Agregar usuarios existentes
            users.forEach(user => {
              const key = user.noUsuario ? String(user.noUsuario) : user.usuario;
              if (key) {
                userMap.set(key, user);
              }
            });
            
            // Agregar usuarios resueltos (sobrescribir si existen)
            validUsers.forEach(user => {
              // Intentar múltiples estrategias para crear la clave
              let key = user.noUsuario ? String(user.noUsuario) : user.usuario;
              
              // Si no hay clave válida, usar idUsuario para usuarios resueltos
              if (!key) {
                key = (user as any).idUsuario ? String((user as any).idUsuario) : (user as any).id ? String((user as any).id) : `resolved-${Math.random()}`;
              }
              
              if (key) {
                userMap.set(key, user);
              } else {
              }
            });
            
            const allUsers = Array.from(userMap.values());
            
            // Remapear con todos los usuarios disponibles
            const successData = this.mapToSuccessData(item, allUsers);
            return this.mapSuccessDataToApproval(successData);
          })
        );
      }),
      tap(appr => {
        if (!local) {
          this.addApproval(appr);
        } else {
          this.updateApproval(appr);
        }
      }),
      catchError((error) => {
        return of(local);
      })
    );
  }

  getDocumentPdf(approvalId: string | number, userId: number): Observable<Blob> {
    const headers = this.headersForUser(userId);
    return this.http.get(`${this.baseUrl}/solicitudes/${approvalId}/pdf`, { 
      headers, 
      responseType: 'blob' 
    });
  }

  getAttachments(approvalId: string | number, userId: number): Observable<any[]> {
    const headers = this.headersForUser(userId);
    return this.http.get<any[]>(`${this.baseUrl}/solicitudes/${approvalId}/adjuntos`, { 
      headers 
    }).pipe(
      catchError(() => of([]))
    );
  }

  downloadAttachment(approvalId: string | number, attachmentId: number, userId: number): Observable<Blob> {
    const headers = this.headersForUser(userId);
    return this.http.get(`${this.baseUrl}/solicitudes/${approvalId}/adjuntos/${attachmentId}/download`, { 
      headers, 
      responseType: 'blob' 
    });
  }

  getApprovalDocument(approvalId: string | number, userId: number): Observable<{ url: string, fileName: string }> {
    const headers = this.headersForUser(userId);
    return this.http.get<any>(`${this.baseUrl}/solicitudes/${approvalId}/documento`, { headers }).pipe(
      map(response => {
        return {
          url: response.url || response.documentoUrl || response.pdfUrl || response.documentUrl,
          fileName: response.fileName || response.documentoFileName || response.nombreArchivo || response.pdfFileName || `documento_${approvalId}.pdf`
        };
      }),
      catchError(error => {
        throw error;
      })
    );
  }

  createSolicitud(payload: {
    idSolicitante: number;
    idTipologia: number;
    destinatarios: number[];
    ordenFirma: boolean;
    comentarioInicial?: string;
    nombreSolicitud?: string;
    pdfPrincipal: File;
    adjuntos?: File[];
  }): Observable<Approval | null> {
    const form = new FormData();
    form.append('idSolicitante', String(payload.idSolicitante));
    form.append('idTipologia', String(payload.idTipologia));
    form.append('tipologiaId', String(payload.idTipologia));
    if (payload.nombreSolicitud) form.append('nombreSolicitud', payload.nombreSolicitud);
    payload.destinatarios.forEach(d => form.append('destinatarios', String(d)));
    form.append('ordenFirma', String(payload.ordenFirma));
    if (payload.comentarioInicial) form.append('comentarioInicial', payload.comentarioInicial);
    if (payload.comentarioInicial) form.append('comentarionicial', payload.comentarioInicial);
    form.append('pdfPrincipal', payload.pdfPrincipal);
    (payload.adjuntos || []).forEach(a => form.append('adjuntos', a));

    return this.http.post<any>(`${this.baseUrl}/solicitudes`, form, { headers: this.headersForUser(payload.idSolicitante) }).pipe(
      map(item => this.mapServerToApproval(item)),
      tap(appr => this.addApproval(appr)),
      catchError(() => of(null))
    );
  }

  aprobarSolicitud(id: string | number, usuarioId: number, comentario?: string): Observable<Approval | undefined> {
    const body: any = { usuarioId };
    if (comentario) body.comentario = comentario;
    const url = `${this.baseUrl}/solicitudes/${id}/aprobar`;
    
    return this.http.post<any>(url, body).pipe(
      map(item => {
        return this.mapServerToApproval(item);
      }),
      tap(appr => this.updateApproval(appr)),
      catchError((error) => {
        throw error;
      })
    );
  }

  rechazarSolicitud(id: string | number, usuarioId: number, comentario?: string): Observable<Approval | undefined> {
    const body: any = { usuarioId };
    if (comentario) body.comentario = comentario;
    const url = `${this.baseUrl}/solicitudes/${id}/rechazar`;
    
    return this.http.post<any>(url, body).pipe(
      map(item => {
        return this.mapServerToApproval(item);
      }),
      tap(appr => this.updateApproval(appr)),
      catchError((error) => {
        throw error;
      })
    );
  }

  cancelarSolicitud(id: string | number, usuarioId: number, comentario?: string): Observable<Approval | undefined> {
    const body: any = { usuarioId };
    if (comentario) body.comentario = comentario;
    const url = `${this.baseUrl}/solicitudes/${id}/cancelar`;
    
    return this.http.post<any>(url, body).pipe(
      map(item => {
        return this.mapServerToApproval(item);
      }),
      tap(appr => this.updateApproval(appr)),
      catchError((error) => {
        throw error;
      })
    );
  }

  getHistorico(usuarioId: number, users: Usuario[], page = 0, size = 10): Observable<Approval[]> {
    const params = new HttpParams()
      .set('usuarioId', String(usuarioId))
      .set('page', String(page))
      .set('size', String(size));
    const url = `${this.baseUrl}/solicitudes/historico`;
    return this.http.get<any>(url, { headers: this.headersForUser(usuarioId), params }).pipe(
      map(res => {
        if (Array.isArray(res)) return res;
        const data = res?.data ?? res;
        return Array.isArray(data?.content) ? data.content : (Array.isArray(data) ? data : []);
      }),
      switchMap((list: any[]) => {
        const approvals = list.map((item: any) => this.mapServerToApproval(item));
        
        // Obtener IDs únicos de creadores que necesitan resolución
        const creatorIds = [...new Set(approvals
          .filter((approval: any) => approval._creadorId)
          .map((approval: any) => approval._creadorId!))];
        
        if (creatorIds.length === 0) {
          return of(approvals);
        }
        
        // Resolver información de usuarios creadores
        const userRequests = creatorIds.map(creatorId => 
          this.userService.obtenerUsuarioPorId(creatorId).pipe(
            catchError(() => of(null))
          )
        );
        
        return forkJoin(userRequests).pipe(
          map(resolvedUsers => {
            const userMap = new Map<number, Usuario>();
            resolvedUsers.forEach(user => {
              if (user) {
                userMap.set(user.noUsuario || (user as any).idUsuario, user);
              }
            });
            
            // Actualizar approvals con información resuelta
            return approvals.map((approval: any) => {
              if (approval._creadorId && userMap.has(approval._creadorId)) {
                const user = userMap.get(approval._creadorId)!;
                return {
                  ...approval,
                  creatorUser: user.usuario || 'Usuario no encontrado',
                  creatorFullName: `${user.nombres || ''} ${user.apellidos || ''}`.trim() || 'Usuario no encontrado',
                  position: this.extractAreaString(user) || 'Funcionario'
                };
              }
              return approval;
            });
          })
        );
      }),
      catchError(() => of([]))
    );
  }

  getFinalizadasPorTipologia(tipologiaId: number, estado: 'APROBADO'|'RECHAZADO'|'CANCELADA' = 'APROBADO', page = 0, size = 10): Observable<Approval[]> {
    const params = new HttpParams()
      .set('tipologiaId', String(tipologiaId))
      .set('estado', estado)
      .set('page', String(page))
      .set('size', String(size));
    const url = `${this.baseUrl}/solicitudes/finalizadas`;
    return this.http.get<any>(url, { params }).pipe(
      map(res => {
        if (Array.isArray(res)) return res;
        const data = res?.data ?? res;
        return Array.isArray(data?.content) ? data.content : (Array.isArray(data) ? data : []);
      }),
      map((list: any[]) => list.map((item: any) => this.mapServerToApproval(item))),
      catchError(() => of([]))
    );
  }

  /**
   * Obtiene todas las solicitudes del área del usuario (independientemente de su rol)
   */
  getApprovalsByArea(usuarioId: number, users: Usuario[], page = 0, size = 1000): Observable<Approval[]> {
    const params = new HttpParams()
      .set('usuarioId', String(usuarioId))
      .set('page', String(page))
      .set('size', String(size));
    const url = `${this.baseUrl}/solicitudes/por-area`;
    return this.http.get<any>(url, { headers: this.headersForUser(usuarioId), params }).pipe(
      map(res => {
        if (Array.isArray(res)) return res;
        const data = res?.data ?? res;
        return Array.isArray(data?.content) ? data.content : (Array.isArray(data) ? data : []);
      }),
      switchMap((list: any[]) => {
        const approvals = list.map((item: any) => this.mapServerToApproval(item));
        
        // Obtener IDs únicos de creadores que necesitan resolución
        const creatorIds = [...new Set(approvals
          .filter((approval: any) => approval._creadorId)
          .map((approval: any) => approval._creadorId!))];
        
        if (creatorIds.length === 0) {
          return of(approvals);
        }
        
        // Resolver información de usuarios creadores
        const userRequests = creatorIds.map(creatorId => 
          this.userService.obtenerUsuarioPorId(creatorId).pipe(
            catchError(() => of(null))
          )
        );
        
        return forkJoin(userRequests).pipe(
          map(resolvedUsers => {
            const userMap = new Map<number, Usuario>();
            resolvedUsers.forEach(user => {
              if (user) {
                userMap.set(user.noUsuario || (user as any).idUsuario, user);
              }
            });
            
            // Actualizar approvals con información resuelta
            return approvals.map((approval: any) => {
              if (approval._creadorId && userMap.has(approval._creadorId)) {
                const user = userMap.get(approval._creadorId)!;
                return {
                  ...approval,
                  creatorFullName: `${user.nombres} ${user.apellidos}`,
                  creatorUser: user
                };
              }
              return approval;
            });
          })
        );
      }),
      catchError(error => {
        // Fallback al método original si el endpoint no existe
        return this.getHistorico(usuarioId, users, page, size);
      })
    );
  }

  getAllApprovals(): Observable<Approval[]> {
    return this.approvals$;
  }

  /**
   * Convierte SuccessModalData a Approval para mantener compatibilidad
   */
  private mapSuccessDataToApproval(successData: SuccessModalData): Approval {
    return {
      type: 'solicitud',
      id: String(successData.id || ''),
      creationDate: successData.fechaCreacion?.toISOString() || new Date().toISOString(),
      creatorUser: successData.creador?.usuario || '',
      creatorFullName: successData.creador ? `${successData.creador.nombres} ${successData.creador.apellidos}`.trim() : '',
      position: this.extractAreaString(successData.creador || undefined) || '',
      lastUpdate: successData.fechaCreacion?.toISOString() || new Date().toISOString(),
      status: this.mapEstadoToStatus(successData.estado || 'Pendiente'),
      approvers: (successData.destinatarios || []).map(dest => ({
        initials: this.getInitials((dest as any).nombresApellidos || ''),
        fullName: (dest as any).nombresApellidos || ''
      })),
      priority: successData.prioridad === 'IMPORTANTE',
      fullData: successData as any // Incluir todos los datos para el modal
    };
  }

  private mapEstadoToStatus(estado: string): 'APROBADO' | 'RECHAZADO' | 'PENDIENTE' | 'CANCELADA' {
    const estadoUpper = estado.toUpperCase();
    if (estadoUpper.includes('APROBADO')) return 'APROBADO';
    if (estadoUpper.includes('RECHAZADO')) return 'RECHAZADO';
    if (estadoUpper.includes('CANCELADO') || estadoUpper.includes('CANCELADA')) return 'CANCELADA';
    return 'PENDIENTE';
  }

  private getInitials(fullName: string): string {
    if (!fullName) return '??';
    const names = fullName.trim().split(' ');
    if (names.length >= 2) {
      return (names[0][0] + names[1][0]).toUpperCase();
    }
    return fullName.substring(0, 2).toUpperCase();
  }
}