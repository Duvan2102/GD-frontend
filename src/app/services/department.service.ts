import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { map, Observable } from 'rxjs';
import { environment } from '../environments/environment';

export interface Department {
  idDepartamento?: number;
  descripcion: string;
}

@Injectable({ providedIn: 'root' })
export class DepartmentService {
  private readonly baseUrl = (
    environment.apiUrl.endsWith('/') ? environment.apiUrl.slice(0, -1) : environment.apiUrl
  ) + '/departamentos';

  constructor(private http: HttpClient) {}

  getAll(): Observable<Department[]> {
    return this.http.get<any>(this.baseUrl).pipe(
      map((res: any) => {
        if (Array.isArray(res)) return res;
        const data = res?.data ?? res;
        const list = data?.content ?? data?.items ?? data?.rows ?? data;
        return Array.isArray(list) ? list : [];
      })
    );
  }

  getById(id: number): Observable<Department> {
    return this.http.get<Department>(`${this.baseUrl}/${id}`);
  }

  create(dept: Partial<Department>): Observable<Department> {
    return this.http.post<Department>(this.baseUrl, dept);
  }

  update(id: number, dept: Partial<Department>): Observable<Department> {
    return this.http.put<Department>(`${this.baseUrl}/${id}`, dept);
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }
}
