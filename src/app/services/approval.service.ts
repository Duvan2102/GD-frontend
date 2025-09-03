import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { catchError, map, tap } from 'rxjs/operators';
import { environment } from '../environments/environment';
import { Approval } from '../pages/approvals/approvals';
import { SuccessModalData, AprobadorState } from '../pages/create-request/request-success-modal/request-success-modal';
import { Usuario } from '../interfaces/common.interfaces';

@Injectable({
  providedIn: 'root'
})
export class ApprovalService {
  private approvalsSubject = new BehaviorSubject<Approval[]>([]);
  approvals$: Observable<Approval[]> = this.approvalsSubject.asObservable();

  private readonly baseUrl = (environment.apiUrl.endsWith('/')
    ? environment.apiUrl.slice(0, -1)
    : environment.apiUrl);

  constructor(private http: HttpClient) { }

  // Helpers
  private headersForUser(userId: number): HttpHeaders {
    return new HttpHeaders({ 'X-User-Id': String(userId) });
  }

  /**
   * Mapea el estado del aprobador a un formato estándar
   */
  private mapApproverState(estado: any): 'Enviado' | 'Aprobado' | 'Rechazado' | 'Cancelado' | 'Pendiente' {
    if (!estado) return 'Pendiente';
    
    const estadoStr = String(estado).toLowerCase();
    if (estadoStr.includes('aprobado') || estadoStr === 'approved') return 'Aprobado';
    if (estadoStr.includes('rechazado') || estadoStr === 'rejected') return 'Rechazado';
    if (estadoStr.includes('cancelado') || estadoStr === 'cancelled') return 'Cancelado';
    if (estadoStr.includes('enviado') || estadoStr === 'sent') return 'Enviado';
    return 'Pendiente';
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

    console.log('[ApprovalService] Registrando metadata de acción:', metadata);

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

  private mapServerToApproval(item: any, users: Usuario[]): Approval {
    // Use proper ID from server, fallback to a more descriptive ID if needed
    const id = item?.id ?? item?.numeroRadicado ?? item?.solicitudId ?? `temp-${Date.now()}`;
    const estado = (item?.estado || 'PENDIENTE').toUpperCase();
    const createdAt = item?.createdAt || item?.fechaCreacion || new Date().toISOString();
    const updatedAt = item?.updatedAt || item?.fechaActualizacion || createdAt;
    const creador = users.find(u => u.usuario === item?.creador?.usuario || u.noUsuario === item?.creadorId);

    const approvers = (item?.destinatarios || []).map((d: any) => {
      const approverUser = users.find(u => u.noUsuario === d.usuarioId);
      const nombres = approverUser?.nombres || d?.nombres || (d?.nombre?.split(' ')[0] || '');
      const apellidos = approverUser?.apellidos || d?.apellidos || (d?.nombre?.split(' ')[1] || '');

      return {
        initials: `${nombres?.[0] || ''}${apellidos?.[0] || ''}`.toUpperCase(),
        fullName: `${nombres} ${apellidos}`.trim()
      };
    });

    return {
      id: String(id),
      type: String(item?.tipologiaId ?? item?.idTipologia ?? ''),
      creationDate: createdAt,
      creatorUser: creador?.usuario || 'desconocido',
      creatorFullName: `${creador?.nombres} ${creador?.apellidos}`.trim() || 'Desconocido',
      position: creador?.cargo || 'Funcionario',
      lastUpdate: updatedAt,
      status: ['APROBADO', 'RECHAZADO', 'PENDIENTE', 'CANCELADA'].includes(estado) ? estado : 'PENDIENTE',
      approvers: approvers,
      priority: Boolean(item?.prioridad === 'IMPORTANTE' || item?.prioridad === true),
      fullData: item
    };
  }
  
  mapToSuccessData(item: any, users: Usuario[]): SuccessModalData {
    const findUserById = (id?: number): Usuario | undefined => users.find(u => u.noUsuario === id);
    const findUserByUsername = (username?: string): Usuario | undefined => users.find(u => u.usuario === username);

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

    const creadorId: number | undefined = item?.creador?.noUsuario || item?.creadorId || item?.idSolicitante;
    const creadorUser: string | undefined = item?.creador?.usuario || item?.creadorUsuario;
    const creador = findUserById(creadorId) || findUserByUsername(creadorUser) || null;

    const destinatariosRaw: any[] = item?.destinatarios || [];
    const destinatarios = destinatariosRaw.map((d: any, index: number) => {
      const idNumber: number | undefined = typeof d === 'number' ? d : (d?.noUsuario || d?.usuarioId || d?.idUsuario || d?.destinatarioId);
      const username: string | undefined = typeof d === 'string' ? d : (d?.usuario || d?.username);
      const user = idNumber ? findUserById(idNumber) : (username ? findUserByUsername(username) : undefined);
      const usuarioId = user?.usuario || username || String(idNumber ?? '');
      const noUsuarioId = user?.noUsuario || idNumber;
      const orden = d?.orden ?? (item?.ordenFirma ? index + 1 : undefined);
      const estadoAprob: any = d?.decision || d?.estado || 'Pendiente';
      return { usuarioId, noUsuarioId, orden, estado: estadoAprob };
    });

    // Mapear estados de aprobadores con metadata
    const approverStates: AprobadorState[] = destinatarios.map(dest => ({
      usuarioId: dest.usuarioId,
      estado: this.mapApproverState(dest.estado),
      fechaAccion: this.getApproverActionDate(item, dest.usuarioId),
      comentario: this.getApproverComment(item, dest.usuarioId),
      metadata: {
        orden: dest.orden,
        noUsuarioId: dest.noUsuarioId,
        timestamp: new Date().toISOString()
      }
    }));

    return {
      id: String(id),
      nombreSolicitud: item?.titulo || item?.nombreSolicitud || `Solicitud ${id}`,
      detallesAdicionales: item?.comentarioInicial || item?.detalles || '',
      prioridad: item?.prioridad === true || item?.prioridad === 'IMPORTANTE' ? 'IMPORTANTE' : 'NORMAL',
      tipologia: String(item?.tipologiaId ?? item?.idTipologia ?? ''),
      enviarRecordatorio: 'NUNCA',
      documentosAnexos: Array.isArray(item?.adjuntos) && item.adjuntos.length > 0,
      establecerOrden: Boolean(item?.ordenFirma),
      destinatarios,
      documentoAprobacion: item?.documentoAprobacion || item?.pdfPrincipal || item?.archivo,
      anexos: item?.adjuntos || item?.anexos,
      creador: creador,
      fechaCreacion: new Date(createdAt),
      estado,
      approverStates: destinatarios.map(d => ({ usuarioId: (d as any).usuarioId, estado: (d as any).estado || 'Pendiente' })),
      // Agregar información del documento para la vista
      documentoUrl: item?.documentoUrl || item?.pdfUrl || item?.urlDocumento || item?.url,
      documentoFileName: item?.documentoFileName || item?.pdfFileName || item?.nombreArchivo || item?.fileName
    };
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
        console.error('Error al eliminar solicitud:', error);
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
      map((list: any[]) => list.map((item: any) => this.mapServerToApproval(item, users))),
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
      map((list: any[]) => list.map((item: any) => this.mapServerToApproval(item, users))),
      tap(list => this.approvalsSubject.next(list)),
      catchError(() => of([]))
    );
  }

  getApprovalDetails(approvalId: string | number, users: Usuario[], userId?: number): Observable<Approval | undefined> {
    const local = this.approvalsSubject.getValue().find(a => a.id.toString() === approvalId.toString());
    const headers = userId ? this.headersForUser(userId) : undefined;
    
    console.log(`[ApprovalService] Fetching details for approval ID: ${approvalId}, userId: ${userId}`);
    
    // Check if the ID looks like a timestamp (invalid for API calls)
    const idStr = String(approvalId);
    if (idStr.startsWith('temp-') || /^\d{13}$/.test(idStr)) {
      console.warn(`[ApprovalService] ID ${approvalId} appears to be a temporary/timestamp ID, returning local data only`);
      return of(local);
    }
    
    return this.http.get<any>(`${this.baseUrl}/solicitudes/${approvalId}`, { headers }).pipe(
      map(item => {
        console.log(`[ApprovalService] Successfully fetched approval details for ID: ${approvalId}`, item);
        return this.mapServerToApproval(item, users);
      }),
      tap(appr => {
        if (!local) {
          this.addApproval(appr);
        } else {
          this.updateApproval(appr);
        }
      }),
      catchError((error) => {
        console.error(`[ApprovalService] Error fetching approval details for ID: ${approvalId}`, error);
        console.log(`[ApprovalService] Returning local approval if available:`, local);
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

  getApprovalDocument(approvalId: string | number, userId: number): Observable<{ url: string, fileName: string }> {
    const headers = this.headersForUser(userId);
    return this.http.get<any>(`${this.baseUrl}/solicitudes/${approvalId}/documento`, { headers }).pipe(
      map(response => ({
        url: response.url || response.documentoUrl || response.pdfUrl,
        fileName: response.fileName || response.documentoFileName || response.nombreArchivo || `documento_${approvalId}.pdf`
      })),
      catchError(error => {
        console.error('Error al obtener documento:', error);
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
      map(item => this.mapServerToApproval(item, [])),
      tap(appr => this.addApproval(appr)),
      catchError(() => of(null))
    );
  }

  aprobarSolicitud(id: string | number, usuarioId: number, comentario?: string): Observable<Approval | undefined> {
    const body: any = { usuarioId };
    if (comentario) body.comentario = comentario;
    const url = `${this.baseUrl}/solicitudes/${id}/aprobar`;
    
    console.log(`[ApprovalService] Aprobando solicitud ${id} con usuario ${usuarioId}`);
    console.log(`[ApprovalService] URL: ${url}`);
    console.log(`[ApprovalService] Body:`, body);
    console.log(`[ApprovalService] Base URL: ${this.baseUrl}`);
    console.log(`[ApprovalService] Environment API URL: ${environment.apiUrl}`);
    
    return this.http.post<any>(url, body).pipe(
      map(item => {
        console.log('[ApprovalService] Respuesta exitosa al aprobar:', item);
        return this.mapServerToApproval(item, []);
      }),
      tap(appr => this.updateApproval(appr)),
      catchError((error) => {
        console.error('[ApprovalService] Error al aprobar solicitud:', error);
        console.error('[ApprovalService] Error details:', {
          status: error.status,
          statusText: error.statusText,
          url: error.url,
          body: error.error,
          headers: error.headers,
          message: error.message,
          name: error.name
        });
        
        // Log del error completo para debugging
        if (error.error) {
          console.error('[ApprovalService] Error body details:', JSON.stringify(error.error, null, 2));
        }
        
        // Log de la petición que se envió
        console.error('[ApprovalService] Request details:', {
          method: 'POST',
          url: url,
          body: body,
          headers: {
            'Content-Type': 'application/json',
            'X-User-Id': String(usuarioId)
          }
        });
        
        throw error;
      })
    );
  }

  rechazarSolicitud(id: string | number, usuarioId: number, comentario?: string): Observable<Approval | undefined> {
    const body: any = { usuarioId };
    if (comentario) body.comentario = comentario;
    const url = `${this.baseUrl}/solicitudes/${id}/rechazar`;
    
    console.log(`[ApprovalService] Rechazando solicitud ${id} con usuario ${usuarioId}`);
    console.log(`[ApprovalService] URL: ${url}`);
    console.log(`[ApprovalService] Body:`, body);
    console.log(`[ApprovalService] Base URL: ${this.baseUrl}`);
    console.log(`[ApprovalService] Environment API URL: ${environment.apiUrl}`);
    
    return this.http.post<any>(url, body).pipe(
      map(item => {
        console.log('[ApprovalService] Respuesta exitosa al rechazar:', item);
        return this.mapServerToApproval(item, []);
      }),
      tap(appr => this.updateApproval(appr)),
      catchError((error) => {
        console.error('[ApprovalService] Error al rechazar solicitud:', error);
        console.error('[ApprovalService] Error details:', {
          status: error.status,
          statusText: error.statusText,
          url: error.url,
          body: error.error,
          headers: error.headers,
          message: error.message,
          name: error.name
        });
        
        // Log del error completo para debugging
        if (error.error) {
          console.error('[ApprovalService] Error body details:', JSON.stringify(error.error, null, 2));
        }
        
        // Log de la petición que se envió
        console.error('[ApprovalService] Request details:', {
          method: 'POST',
          url: url,
          body: body,
          headers: {
            'Content-Type': 'application/json',
            'X-User-Id': String(usuarioId)
          }
        });
        
        throw error;
      })
    );
  }

  cancelarSolicitud(id: string | number, usuarioId: number, comentario?: string): Observable<Approval | undefined> {
    const body: any = { usuarioId };
    if (comentario) body.comentario = comentario;
    const url = `${this.baseUrl}/solicitudes/${id}/cancelar`;
    
    console.log(`[ApprovalService] Cancelando solicitud ${id} con usuario ${usuarioId}`);
    console.log(`[ApprovalService] URL: ${url}`);
    console.log(`[ApprovalService] Body:`, body);
    console.log(`[ApprovalService] Base URL: ${this.baseUrl}`);
    console.log(`[ApprovalService] Environment API URL: ${environment.apiUrl}`);
    
    return this.http.post<any>(url, body).pipe(
      map(item => {
        console.log('[ApprovalService] Solicitud cancelada exitosamente:', item);
        return this.mapServerToApproval(item, []);
      }),
      tap(appr => this.updateApproval(appr)),
      catchError((error) => {
        console.error('[ApprovalService] Error al cancelar solicitud:', error);
        console.error('[ApprovalService] Error details:', {
          status: error.status,
          statusText: error.statusText,
          url: error.url,
          body: error.error,
          headers: error.headers,
          message: error.message,
          name: error.name
        });
        
        // Log del error completo para debugging
        if (error.error) {
          console.error('[ApprovalService] Error body details:', JSON.stringify(error.error, null, 2));
        }
        
        // Log de la petición que se envió
        console.error('[ApprovalService] Request details:', {
          method: 'POST',
          url: url,
          body: body,
          headers: {
            'Content-Type': 'application/json',
            'X-User-Id': String(usuarioId)
          }
        });
        
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
      map((list: any[]) => list.map((item: any) => this.mapServerToApproval(item, users))),
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
      map((list: any[]) => list.map((item: any) => this.mapServerToApproval(item, []))),
      catchError(() => of([]))
    );
  }

  getAllApprovals(): Observable<Approval[]> {
    return this.approvals$;
  }


}