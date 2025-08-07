import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../environments/environment';

export interface Area {
  idArea?: number;
  descripcion: string;
  departamento: {
    idDepartamento: number;
    descripcion?: string;
  };
}

@Injectable({ providedIn: 'root' })
export class AreaService {
  private baseUrl = `${environment.apiUrl}areas`; 

  constructor(private http: HttpClient) {}

  getAll(): Observable<Area[]> {
    return this.http.get<Area[]>(this.baseUrl);
  }

  getById(id: number) {
  return this.http.get<Area>(`/api/areas/${id}`);
}


  create(area: Area): Observable<Area> {
    return this.http.post<Area>(this.baseUrl, area);
  }

  update(id: number, area: Area): Observable<Area> {
    return this.http.put<Area>(`${this.baseUrl}/${id}`, area);
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }
}
