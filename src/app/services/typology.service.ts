import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { map, Observable, shareReplay, tap, of } from 'rxjs';
import { Position } from './positions.service';
import { environment } from '../environments/environment';

export interface Typology {
  idTipologia: number;
  descripcion: string;
  cargo?: Position;
  requiereProceso?: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class TypologyService {
  private readonly baseUrl = (
    environment.apiUrl.endsWith('/') ? environment.apiUrl.slice(0, -1) : environment.apiUrl
  ) + '/tipologias';
  private typologiesCache: Typology[] | null = null;
  private lastCacheTime = 0;
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutos

  constructor(private http: HttpClient) { }

  clearTypologiesCache(): void {
    this.typologiesCache = null;
    this.lastCacheTime = 0;
  }

  getAll(): Observable<Typology[]> {
    const now = Date.now();
    if (this.typologiesCache && (now - this.lastCacheTime) < this.CACHE_DURATION) {
      return of(this.typologiesCache);
    }

    return this.http.get<any>(this.baseUrl).pipe(
      map((res: any) => {
        if (Array.isArray(res)) return res;
        const data = res?.data ?? res;
        const list = data?.content ?? data?.items ?? data?.rows ?? data?.tipologias ?? data?.results ?? data?.list ?? data;
        return Array.isArray(list) ? list : [];
      }),
      tap(typologies => {
        this.typologiesCache = typologies;
        this.lastCacheTime = now;
      }),
      shareReplay(1)
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
