import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../environments/environment';

export interface AuditFilters {
  fechas?: {
    fechaDesde?: string;
    fechaHasta?: string;
  };
  solicitante?: string; // Usuario creador de la solicitud
  estado?: string; // Puede ser un estado específico o 'TODOS' para traer todos
  tipologia?: string; // Puede ser un tipo específico o 'TODOS' para traer todos
  departamento?: string; // Puede ser un departamento específico o 'TODOS' para traer todos
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

  /**
   * Crea headers con el ID de usuario
   */
  private headersForUser(userId: number): HttpHeaders {
    return new HttpHeaders({ 'X-User-Id': String(userId) });
  }

  /**
   * Busca solicitudes con filtros
   */
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

  /**
   * Genera y descarga el Excel de auditoría
   * Envía los IDs como strings tal como el backend los espera
   * El interceptor HTTP agrega automáticamente:
   * - Authorization: Bearer ${token}
   * - X-User-Id
   * - Content-Type: application/json
   */
  generarExcel(request: AuditExcelRequest, userId: number): Observable<Blob> {
    // Validar que hay IDs para exportar
    if (!request.selectedIds || request.selectedIds.length === 0) {
      throw new Error('No hay IDs seleccionados para exportar');
    }
    
    // Preparar el request body - los IDs deben ser strings
    const requestBody = {
      selectedIds: request.selectedIds
    };
    
    console.log('📤 Enviando solicitud al backend:');
    console.log('📤 URL:', `${this.baseUrl}/excel`);
    console.log('📤 Body:', JSON.stringify(requestBody, null, 2));
    console.log('📤 User ID:', userId);
    
    // El interceptor HTTP agrega automáticamente los headers necesarios
    return this.http.post(
      `${this.baseUrl}/excel`,
      requestBody,
      { 
        responseType: 'blob'
      }
    );
  }
}

