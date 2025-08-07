import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
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
   private baseUrl = `${environment.apiUrl}tipologias`;

  constructor(private http: HttpClient) { }

  getAll(): Observable<Typology[]> {
    return this.http.get<Typology[]>(this.baseUrl);
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