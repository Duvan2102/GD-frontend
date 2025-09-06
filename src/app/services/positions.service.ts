import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { map, Observable } from 'rxjs';
import { environment } from '../environments/environment';
import { Area } from './area.service';

export interface Position {
  idCargo?: number;
  descripcion: string;
  area: Area;
  permisos?: {
    esAdministrador: boolean;
    esAuditor: boolean;
  };
}

@Injectable({  providedIn: 'root'})
export class PositionService {
  private readonly baseUrl = (
    environment.apiUrl.endsWith('/') ? environment.apiUrl.slice(0, -1) : environment.apiUrl
  ) + '/cargos';

  constructor(private http: HttpClient) {}

  getAll(): Observable<Position[]> {
    return this.http.get<any>(this.baseUrl).pipe(
      map((res: any) => {
        if (Array.isArray(res)) return res;
        const data = res?.data ?? res;
        const list = data?.content ?? data?.items ?? data?.rows ?? data;
        return Array.isArray(list) ? list : [];
      })
    );
  }

  getById(id: number): Observable<Position> {
    return this.http.get<Position>(`${this.baseUrl}/${id}`);
  }

  create(position: Partial<Position>): Observable<Position> {
    return this.http.post<Position>(this.baseUrl, position);
  }

  update(id: number, position: Position): Observable<Position> {
    return this.http.put<Position>(`${this.baseUrl}/${id}`, position);
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }
}
