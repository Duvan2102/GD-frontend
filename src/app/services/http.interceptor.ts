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
  const isSolicitudes = req.url.startsWith('/solicitudes') || req.url.includes('/solicitudes');
  const isApi = req.url.startsWith('/api') || req.url.includes('/api/');

  let headers = req.headers;
  if ((isSolicitudes || isApi) && user?.noUsuario) {
    headers = headers.set('X-User-Id', String(user.noUsuario));
  }
  // Evitar forzar Content-Type cuando es FormData
  if (!isFormData(req.body) && !headers.has('Content-Type')) {
    headers = headers.set('Content-Type', 'application/json');
  }

  const corrId = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  headers = headers.set('X-Correlation-Id', corrId);

  const cloned = req.clone({ headers });

  if (environment.enableLogging) {
    // Log básico de solicitudes/respuestas para debug en dev
    return next(cloned).pipe(
      tap({
        next: (event) => {
          // console.debug('HTTP OK', cloned.method, cloned.url, event);
        },
        error: (err) => {
          // console.error('HTTP ERROR', cloned.method, cloned.url, err);
        }
      })
    );
  }
  return next(cloned);
};
