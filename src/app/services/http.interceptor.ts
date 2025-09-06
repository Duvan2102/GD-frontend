import { HttpEvent, HttpInterceptorFn, HttpRequest } from '@angular/common/http';
import { inject } from '@angular/core';
import { Observable, tap } from 'rxjs';
import { environment } from '../environments/environment';
import { AuthService } from './auth.service';

function isFormData(body: any): boolean {
  return typeof FormData !== 'undefined' && body instanceof FormData;
}

export const apiInterceptor: HttpInterceptorFn = (req: HttpRequest<any>, next): Observable<HttpEvent<any>> => {
  const auth = inject(AuthService);
  const user = auth.getCurrentUserValue();
  const token = auth.getToken();
  const isApi = req.url.startsWith('/api') || req.url.includes('/api/');
  const isSolicitudes = req.url.includes('/solicitudes');

  let headers = req.headers;

  // Agregar token de autenticación si existe
  if (token && (isApi || isSolicitudes)) {
    headers = headers.set('Authorization', `Bearer ${token}`);
  }

  // Agregar ID de usuario si existe (para compatibilidad con el sistema actual)
  if ((isApi || isSolicitudes) && user?.idUsuario) {
    headers = headers.set('X-User-Id', String(user.idUsuario));
  }
  // Evitar forzar Content-Type cuando es FormData
  if (!isFormData(req.body) && !headers.has('Content-Type')) {
    headers = headers.set('Content-Type', 'application/json');
  }

  const corrId = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  headers = headers.set('X-Correlation-Id', corrId);

  const cloned = req.clone({ headers });

  // Log detallado para debugging de errores 400
  if (isSolicitudes && (req.method === 'POST' || req.method === 'PUT')) {
    const headersObj: { [key: string]: string } = {};
    cloned.headers.keys().forEach(key => {
      headersObj[key] = cloned.headers.get(key) || '';
    });

  }

  if (environment.enableLogging) {
    // Log básico de solicitudes/respuestas para debug en dev
    return next(cloned).pipe(
      tap({
        next: (event) => {
        },
        error: (err) => {
        }
      })
    );
  }
  return next(cloned);
};
