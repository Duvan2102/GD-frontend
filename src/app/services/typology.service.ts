import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { map, Observable, shareReplay } from 'rxjs';
import { Position } from './positions.service';
import { environment } from '../environments/environment';

export interface Typology {
  idTipologia: number;
  descripcion: string;
  cargo?: Position;
}

@Injectable({
  providedIn: 'root'
})
export class TypologyService {
  private readonly baseUrl = (
    environment.apiUrl.endsWith('/') ? environment.apiUrl.slice(0, -1) : environment.apiUrl
  ) + '/tipologias';

  constructor(private http: HttpClient) { }

  getAll(): Observable<Typology[]> {
    return this.http.get<any>(this.baseUrl).pipe(
      map((res: any) => {
        if (Array.isArray(res)) return res;
        const data = res?.data ?? res;
        const list = data?.content ?? data?.items ?? data?.rows ?? data?.tipologias ?? data?.results ?? data?.list ?? data;
        return Array.isArray(list) ? list : [];
      }),
      shareReplay(1) // Evitar múltiples llamadas HTTP para el mismo endpoint
    );
  }

   getById(id: number): Observable<Typology> {
    return this.http.get<Typology>(`${this.baseUrl}/${id}`);
  }

  create(typology: Partial<Typology>): Observable<Typology> {
    return this.http.post<Typology>(this.baseUrl, typology);
  }

  update(id: number, typology: Partial<Typology>): Observable<Typology> {
    return this.http.put<Typology>(`${this.baseUrl}/${id}`, typology);
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }
}
