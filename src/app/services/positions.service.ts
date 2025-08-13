// src/app/services/position.service.ts

import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../environments/environment';
import { Area } from './area.service';

export interface Position {
  idCargo?: number;
  descripcion: string;
  area: Area
}

@Injectable({  providedIn: 'root'})
export class PositionService {
  private baseUrl = `${environment.apiUrl}/cargos`;

  private readonly httpOptions = {
    headers: new HttpHeaders({
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization'
    })
  };

  constructor(private http: HttpClient) {}

  getAll(): Observable<Position[]> {
    return this.http.get<Position[]>(this.baseUrl);
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
