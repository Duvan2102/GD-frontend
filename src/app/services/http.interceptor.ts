import { HttpEvent, HttpInterceptorFn, HttpRequest, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { Observable, tap, catchError, throwError } from 'rxjs';
import { Router } from '@angular/router';
import { environment } from '../environments/environment';
import { AuthService } from './auth.service';

function isFormData(body: any): boolean {
  return typeof FormData !== 'undefined' && body instanceof FormData;
}

function isTokenExpired(token: string): boolean {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    const exp = payload.exp;
    
    if (!exp) {
      return false;
    }
    
    const currentTime = Math.floor(Date.now() / 1000);
    return currentTime >= exp;
  } catch (error) {
    console.error('Error al verificar expiración del token:', error);
    return true;
  }
}

export const apiInterceptor: HttpInterceptorFn = (req: HttpRequest<any>, next): Observable<HttpEvent<any>> => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const user = auth.getCurrentUserValue();
  const token = auth.getToken();

  if (token && isTokenExpired(token)) {
    console.warn('🔐 Token expirado - Redirigiendo al login');
    auth.logoutSync();
    router.navigate(['/login'], { queryParams: { expired: 'true' } });
    return throwError(() => new Error('Token expirado'));
  }

  const isLocalhost = req.url.includes('localhost:8080');
  const isApiPath = req.url.startsWith('/api');
  const isSpecificEndpoint = req.url.includes('/usuarios') ||
                            req.url.includes('/auth') ||
                            req.url.includes('/solicitudes') ||
                            req.url.includes('/areas') ||
                            req.url.includes('/departamentos') ||
                            req.url.includes('/cargos') ||
                            req.url.includes('/tipologias') ||
                            req.url.includes('/auditoria');

  const isApi = isLocalhost || isApiPath || isSpecificEndpoint;
  const isSolicitudes = req.url.includes('/solicitudes');
  const isAuditoria = req.url.includes('/auditoria');
  const isTwoFAValidation = req.url.includes('/auth/validate-2fa') || req.url.includes('/validar-2fa');
  const hasTempTokenInBody = !!req.body && typeof req.body === 'object' && 'tempToken' in req.body;
  const requiresAuth = isApi || isSolicitudes || isAuditoria;

  let headers = req.headers;

  // Agregar Authorization header
  if (token && requiresAuth && !(isTwoFAValidation && hasTempTokenInBody)) {
    headers = headers.set('Authorization', `Bearer ${token}`);
  }

  // Agregar X-User-Id header
  if (requiresAuth && user?.idUsuario) {
    headers = headers.set('X-User-Id', String(user.idUsuario));
  }
  
  if (!isFormData(req.body) && !headers.has('Content-Type')) {
    headers = headers.set('Content-Type', 'application/json');
  }

  const corrId = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  headers = headers.set('X-Correlation-Id', corrId);

  const cloned = req.clone({ headers });

  if (isSolicitudes && (req.method === 'POST' || req.method === 'PUT')) {
    const headersObj: { [key: string]: string } = {};
    cloned.headers.keys().forEach(key => {
      headersObj[key] = cloned.headers.get(key) || '';
    });
  }

  return next(cloned).pipe(
    catchError((error: HttpErrorResponse) => {
      if (error.status === 401 || error.status === 403) {        
        const errorMessage = error.error?.message || error.message || '';
        const isTokenError = errorMessage.toLowerCase().includes('token') || 
                           errorMessage.toLowerCase().includes('unauthorized') ||
                           errorMessage.toLowerCase().includes('expired') ||
                           errorMessage.toLowerCase().includes('invalid');
        
        if (isTokenError) {
          auth.logoutSync();
          router.navigate(['/login'], { queryParams: { expired: 'true' } });
        }
      }
      
      return throwError(() => error);
    }),
    tap({
      next: (event) => {
        if (environment.enableLogging) {
        }
      },
      error: (err) => {
        if (environment.enableLogging) {
        }
      }
    })
  );
};
