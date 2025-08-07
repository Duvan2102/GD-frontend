import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../environments/environment';

export interface Department {
  idDepartamento?: number;
  descripcion: string;
}

@Injectable({ providedIn: 'root' })
export class DepartmentService {
  private baseUrl = `${environment.apiUrl}departamentos`;

  constructor(private http: HttpClient) {}

  getAll(): Observable<Department[]> {
    return this.http.get<Department[]>(this.baseUrl);
  }

  getById(id: number): Observable<Department> {
    return this.http.get<Department>(`${this.baseUrl}/${id}`);
  }

  create(dept: Partial<Department>): Observable<Department> {
    return this.http.post<Department>(this.baseUrl, dept);
  }

  update(id: number, dept: Partial<Department>): Observable<Department> {
    return this.http.post<Department>(`${this.baseUrl}`, dept);
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }
}
