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

  const isLocalhost = req.url.includes('localhost:8080');
  const isApiPath = req.url.startsWith('/api');
  const isSpecificEndpoint = req.url.includes('/usuarios') ||
                            req.url.includes('/auth') ||
                            req.url.includes('/solicitudes') ||
                            req.url.includes('/areas') ||
                            req.url.includes('/departamentos') ||
                            req.url.includes('/cargos') ||
                            req.url.includes('/tipologias');

  const isApi = isLocalhost || isApiPath || isSpecificEndpoint;
  const isSolicitudes = req.url.includes('/solicitudes');

  let headers = req.headers;

  // Log detallado para debugging
  console.log('🔍 Interceptor HTTP - Analizando petición:', {
    url: req.url,
    method: req.method,
    hasToken: !!token,
    tokenLength: token?.length || 0,
    isLocalhost,
    isApiPath,
    isSpecificEndpoint,
    isApi,
    isSolicitudes,
    userExists: !!user,
    userId: user?.idUsuario
  });

  // Agregar token de autenticación si existe
  if (token && isApi) {
    headers = headers.set('Authorization', `Bearer ${token}`);
    console.log('🔐 Token JWT agregado a la petición:', req.url);
  } else {
    console.log('❌ Token JWT NO agregado:', {
      url: req.url,
      hasToken: !!token,
      isApi,
      isSolicitudes,
      reason: !token ? 'No hay token' : 'No es petición de API'
    });
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
    console.log('Request headers:', headersObj);
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
