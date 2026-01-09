import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../environments/environment';

export interface AuditFilters {
  fechas?: {
    fechaDesde?: string;
    fechaHasta?: string;
  };
  solicitante?: string;
  estado?: string;
  tipologia?: string;
  departamento?: string;
}

export interface AuditSearchRequest {
  filters: AuditFilters;
  page?: number;
  size?: number;
  sort?: string;
}

export interface AuditSearchResponse {
  content: any[];
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;
}

export interface AuditExcelRequest {
  selectedIds: string[];
}

@Injectable({
  providedIn: 'root'
})
export class AuditService {
  private readonly baseUrl = (environment.apiUrl.endsWith('/')
    ? environment.apiUrl.slice(0, -1)
    : environment.apiUrl) + '/auditoria';

  constructor(private http: HttpClient) {}

  private headersForUser(userId: number): HttpHeaders {
    return new HttpHeaders({ 'X-User-Id': String(userId) });
  }

  buscarSolicitudes(request: AuditSearchRequest, userId: number): Observable<AuditSearchResponse> {
    const params = new HttpParams()
      .set('page', String(request.page || 0))
      .set('size', String(request.size || 20))
      .set('sort', request.sort || 'createdAt,DESC');

    return this.http.post<AuditSearchResponse>(
      `${this.baseUrl}/buscar`,
      { filters: request.filters },
      { 
        headers: this.headersForUser(userId),
        params 
      }
    );
  }

  generarExcel(request: AuditExcelRequest, userId: number): Observable<Blob> {
    if (!request.selectedIds || request.selectedIds.length === 0) {
      throw new Error('No hay IDs seleccionados para exportar');
    }
    
    const requestBody = {
      selectedIds: request.selectedIds
    };
    
    console.log('📤 Enviando solicitud al backend:');
    console.log('📤 URL:', `${this.baseUrl}/excel`);
    console.log('📤 Body:', JSON.stringify(requestBody, null, 2));
    console.log('📤 User ID:', userId);
    
    return this.http.post(
      `${this.baseUrl}/excel`,
      requestBody,
      { 
        responseType: 'blob'
      }
    );
  }
}

