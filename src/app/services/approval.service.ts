import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { catchError, map, tap } from 'rxjs/operators';
import { environment } from '../environments/environment';
import { Approval } from '../pages/approvals/approvals';
import { SuccessModalData } from '../pages/create-request/request-success-modal/request-success-modal';
import { Usuario } from '../interfaces/common.interfaces';

@Injectable({
  providedIn: 'root'
})
export class ApprovalService {
  private approvalsSubject = new BehaviorSubject<Approval[]>([]);
  approvals$: Observable<Approval[]> = this.approvalsSubject.asObservable();

  private readonly baseUrl = (environment.solicitudesUrl.endsWith('/')
    ? environment.solicitudesUrl.slice(0, -1)
    : environment.solicitudesUrl);

  constructor(private http: HttpClient) { }

  // Helpers
  private headersForUser(userId: number): HttpHeaders {
    return new HttpHeaders({ 'X-User-Id': String(userId) });
  }

  private mapServerToApproval(item: any): Approval {
    const id = item?.id ?? item?.numeroRadicado ?? String(Date.now());
    const estado = (item?.estado || 'PENDIENTE').toUpperCase();
    const createdAt = item?.createdAt || item?.fechaCreacion || new Date().toISOString();
    const updatedAt = item?.updatedAt || item?.fechaActualizacion || createdAt;
    const creadorUser = item?.creador?.usuario || item?.creadorUsuario || 'desconocido';
    const position = item?.creador?.cargo || item?.cargo || 'Funcionario';
    const tipologiaId = String(item?.tipologiaId ?? item?.idTipologia ?? '');
    const destinatarios: any[] = item?.destinatarios || [];
    return {
      id: String(id),
      type: tipologiaId,
      creationDate: createdAt,
      creatorUser: String(creadorUser),
      position: String(position),
      lastUpdate: updatedAt,
      status: ['APROBADO', 'RECHAZADO', 'PENDIENTE', 'CANCELADA'].includes(estado) ? estado : 'PENDIENTE',
      approvers: destinatarios.map(d => {
        const nombres = d?.nombres || d?.nombre || '';
        const apellidos = d?.apellidos || d?.apellido || '';
        const ini = `${nombres?.[0] || ''}${apellidos?.[0] || ''}`.toUpperCase();
        return ini || (d?.usuario || '??');
      }),
      priority: Boolean(item?.prioridad === 'IMPORTANTE' || item?.prioridad === true),
      fullData: item
    };
  }

  // Maps backend payload to SuccessModalData expected by the modal
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
      const orden = d?.orden ?? (item?.ordenFirma ? index + 1 : undefined);
      const estadoAprob: any = d?.estado || d?.decision || 'Pendiente';
      return { usuarioId, orden, estado: estadoAprob };
    });

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
      documentoAprobacion: undefined,
      anexos: undefined,
      creador: creador,
      fechaCreacion: new Date(createdAt),
      estado,
      approverStates: destinatarios.map(d => ({ usuarioId: (d as any).usuarioId, estado: (d as any).estado || 'Pendiente' }))
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

  deleteApproval(approvalId: string | number) {
    const currentApprovals = this.approvalsSubject.getValue();
    const filteredApprovals = currentApprovals.filter(a => a.id.toString() !== approvalId.toString());
    this.approvalsSubject.next(filteredApprovals);
  }

  // Backend integrations
  getApprovalsByCreator(userId: number, page = 0, size = 10): Observable<Approval[]> {
    const params = new HttpParams()
      .set('creadorId', String(userId))
      .set('page', String(page))
      .set('size', String(size))
      .set('sort', 'createdAt,desc');
    return this.http.get<any>(this.baseUrl, { headers: this.headersForUser(userId), params }).pipe(
      map(res => {
        if (Array.isArray(res)) return res;
        const data = res?.data ?? res;
        return Array.isArray(data?.content) ? data.content : (Array.isArray(data) ? data : []);
      }),
      map((list: any[]) => list.map((item: any) => this.mapServerToApproval(item))),
      tap(list => this.approvalsSubject.next(list)),
      catchError(() => of([]))
    );
  }

  getApprovalsForApprover(userId: number, page = 0, size = 10): Observable<Approval[]> {
    const params = new HttpParams()
      .set('usuarioId', String(userId))
      .set('page', String(page))
      .set('size', String(size));
    const url = `${this.baseUrl}/para-gestionar`;
    return this.http.get<any>(url, { headers: this.headersForUser(userId), params }).pipe(
      map(res => {
        if (Array.isArray(res)) return res;
        const data = res?.data ?? res;
        return Array.isArray(data?.content) ? data.content : (Array.isArray(data) ? data : []);
      }),
      map((list: any[]) => list.map((item: any) => this.mapServerToApproval(item))),
      tap(list => this.approvalsSubject.next(list)),
      catchError(() => of([]))
    );
  }

  getApprovalDetails(approvalId: string | number, userId?: number): Observable<Approval | undefined> {
    const local = this.approvalsSubject.getValue().find(a => a.id.toString() === approvalId.toString());
    const headers = userId ? this.headersForUser(userId) : undefined;
    return this.http.get<any>(`${this.baseUrl}/${approvalId}`, { headers }).pipe(
      map(item => this.mapServerToApproval(item)),
      tap(appr => {
        // sync cache
        if (!local) {
          this.addApproval(appr);
        } else {
          this.updateApproval(appr);
        }
      }),
      catchError(() => of(local))
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
    // Compatibilidad: algunos backends aceptan tipologiaId
    form.append('tipologiaId', String(payload.idTipologia));
    if (payload.nombreSolicitud) form.append('nombreSolicitud', payload.nombreSolicitud);
    payload.destinatarios.forEach(d => form.append('destinatarios', String(d)));
    // Compatibilidad: algunos backends esperan destinatarios[]
    payload.destinatarios.forEach(d => form.append('destinatarios[]', String(d)));
    // Compatibilidad: JSON de destinatarios
    form.append('destinatariosJson', JSON.stringify(payload.destinatarios));
    form.append('ordenFirma', String(payload.ordenFirma));
    if (payload.comentarioInicial) form.append('comentarioInicial', payload.comentarioInicial);
    // Alias común mal escrito detectado en algunos entornos
    if (payload.comentarioInicial) form.append('comentarionicial', payload.comentarioInicial);
    form.append('pdfPrincipal', payload.pdfPrincipal);
    (payload.adjuntos || []).forEach(a => form.append('adjuntos', a));

    return this.http.post<any>(this.baseUrl, form, { headers: this.headersForUser(payload.idSolicitante) }).pipe(
      map(item => this.mapServerToApproval(item)),
      tap(appr => this.addApproval(appr)),
      catchError(() => of(null))
    );
  }

  aprobarSolicitud(id: string | number, usuarioId: number, comentario?: string): Observable<Approval | undefined> {
    const body: any = { usuarioId };
    if (comentario) body.comentario = comentario;
    const url = `${this.baseUrl}/${id}/aprobar`;
    return this.http.post<any>(url, body, { headers: this.headersForUser(usuarioId) }).pipe(
      map(item => this.mapServerToApproval(item)),
      tap(appr => this.updateApproval(appr)),
      catchError(() => this.getApprovalDetails(id, usuarioId))
    );
  }

  rechazarSolicitud(id: string | number, usuarioId: number, comentario?: string): Observable<Approval | undefined> {
    const body: any = { usuarioId };
    if (comentario) body.comentario = comentario;
    const url = `${this.baseUrl}/${id}/rechazar`;
    return this.http.post<any>(url, body, { headers: this.headersForUser(usuarioId) }).pipe(
      map(item => this.mapServerToApproval(item)),
      tap(appr => this.updateApproval(appr)),
      catchError(() => this.getApprovalDetails(id, usuarioId))
    );
  }

  cancelarSolicitud(id: string | number, usuarioId: number, comentario?: string): Observable<Approval | undefined> {
    // Try common patterns: cancelar, cancel, delete
    const headers = this.headersForUser(usuarioId);
    const body: any = comentario ? { usuarioId, comentario } : { usuarioId };
    const tryPost = (suffix: string) => this.http.post<any>(`${this.baseUrl}/${id}/${suffix}`, body, { headers }).pipe(
      map(item => this.mapServerToApproval(item)),
      tap(appr => this.updateApproval(appr))
    );
    const tryDelete = () => this.http.delete<any>(`${this.baseUrl}/${id}`, { headers }).pipe(
      map(item => this.mapServerToApproval(item)),
      tap(appr => this.updateApproval(appr))
    );
    return tryPost('cancelar').pipe(
      catchError(() => tryPost('cancel')),
      catchError(() => tryDelete()),
      catchError(() => this.getApprovalDetails(id, usuarioId))
    );
  }

  getHistorico(usuarioId: number, page = 0, size = 10): Observable<Approval[]> {
    const params = new HttpParams()
      .set('usuarioId', String(usuarioId))
      .set('page', String(page))
      .set('size', String(size));
    const url = `${this.baseUrl}/historico`;
    return this.http.get<any>(url, { headers: this.headersForUser(usuarioId), params }).pipe(
      map(res => {
        if (Array.isArray(res)) return res;
        const data = res?.data ?? res;
        return Array.isArray(data?.content) ? data.content : (Array.isArray(data) ? data : []);
      }),
      map((list: any[]) => list.map((item: any) => this.mapServerToApproval(item))),
      catchError(() => of([]))
    );
  }

  getFinalizadasPorTipologia(tipologiaId: number, estado: 'APROBADO'|'RECHAZADO'|'CANCELADA' = 'APROBADO', page = 0, size = 10): Observable<Approval[]> {
    const params = new HttpParams()
      .set('tipologiaId', String(tipologiaId))
      .set('estado', estado)
      .set('page', String(page))
      .set('size', String(size));
    const url = `${this.baseUrl}/finalizadas`;
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

  getAllApprovals(): Observable<Approval[]> {
    return this.approvals$;
  }
}
