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
  const isApi = req.url.startsWith('/api') || req.url.includes('/api/');
  const isSolicitudes = req.url.includes('/solicitudes');

  let headers = req.headers;
  if ((isApi || isSolicitudes) && user?.noUsuario) {
    headers = headers.set('X-User-Id', String(user.noUsuario));
    console.log(`[HTTP Interceptor] Agregando X-User-Id: ${user.noUsuario} para URL: ${req.url}`);
  }
  // Evitar forzar Content-Type cuando es FormData
  if (!isFormData(req.body) && !headers.has('Content-Type')) {
    headers = headers.set('Content-Type', 'application/json');
    console.log(`[HTTP Interceptor] Agregando Content-Type: application/json para URL: ${req.url}`);
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
    
    console.log(`[HTTP Interceptor] Request details:`, {
      method: req.method,
      url: req.url,
      body: req.body,
      headers: headersObj,
      user: user?.noUsuario,
      isApi,
      isSolicitudes
    });
  }

  if (environment.enableLogging) {
    // Log básico de solicitudes/respuestas para debug en dev
    return next(cloned).pipe(
      tap({
        next: (event) => {
          // console.debug('HTTP OK', cloned.method, cloned.url, event);
        },
        error: (err) => {
          console.error(`[HTTP Interceptor] Error en ${cloned.method} ${cloned.url}:`, {
            status: err.status,
            statusText: err.statusText,
            error: err.error,
            headers: err.headers
          });
        }
      })
    );
  }
  return next(cloned);
};
