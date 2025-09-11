import { Injectable } from '@angular/core';
import { Observable, of, throwError } from 'rxjs';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { map, catchError, switchMap } from 'rxjs/operators';
import { environment } from '../environments/environment';
import { DobleAutenticacionTipo } from '../interfaces/common.interfaces';
import { AuthService } from './auth.service';

export interface TokenValidationRequest {
  token: string;
  action: 'approve' | 'reject';
  documentId?: string | number;
  comment?: string;
  tempToken?: string;
}

export interface TokenValidationResponse {
  success: boolean;
  message: string;
  valid: boolean;
  tokenType?: DobleAutenticacionTipo;
}

export interface UserAuthType {
  hasGoogleAuth: boolean;
  hasEmailBackup: boolean;
  authType: DobleAutenticacionTipo | null;
}

@Injectable({
  providedIn: 'root'
})
export class AuthTokenService {
  private apiUrl = environment.apiUrl;
  private readonly httpOptions = {
    headers: new HttpHeaders({
      'Content-Type': 'application/json',
    })
  };

  constructor(
    private http: HttpClient,
    private authService: AuthService
  ) {}

  /**
   * Obtiene el tipo de autenticación del usuario actual
   */
  getUserAuthType(): Observable<UserAuthType> {
    const currentUser = this.authService.getCurrentUserValue();
    if (!currentUser) {
      return of({
        hasGoogleAuth: false,
        hasEmailBackup: true,
        authType: DobleAutenticacionTipo.TOKEN_SEGURIDAD
      });
    }

    // Usar método 2FA persistido del login
    const persisted2FA = this.getPersisted2FAMethod();
    if (persisted2FA) {
      return of({
        hasGoogleAuth: persisted2FA.hasGoogleAuth || false,
        hasEmailBackup: persisted2FA.hasEmailBackup || true,
        authType: persisted2FA.hasGoogleAuth ? 
          DobleAutenticacionTipo.GOOGLE_AUTHENTICATOR : 
          DobleAutenticacionTipo.TOKEN_SEGURIDAD
      });
    }

    // Fallback al estado 2FA del login
    return this.authService.getTwoFAState().pipe(
      switchMap(twoFAState => {
        if (twoFAState) {
          return of({
            hasGoogleAuth: twoFAState.hasGoogleAuth || false,
            hasEmailBackup: twoFAState.hasEmailBackup || true,
            authType: twoFAState.hasGoogleAuth ? 
              DobleAutenticacionTipo.GOOGLE_AUTHENTICATOR : 
              DobleAutenticacionTipo.TOKEN_SEGURIDAD
          });
        }
        return this.getUserAuthTypeFromBackend();
      }),
      catchError(() => this.getUserAuthTypeFromBackend())
    );
  }

  private getPersisted2FAMethod(): any | null {
    try {
      const persisted = localStorage.getItem('user_2fa_method');
      if (persisted) {
        const data = JSON.parse(persisted);
        // Verificar que no sea muy antiguo (máximo 24 horas)
        const maxAge = 24 * 60 * 60 * 1000; // 24 horas en ms
        if (Date.now() - data.timestamp < maxAge) {
          return data;
        } else {
          console.log('🔐 Método 2FA persistido expirado, eliminando...');
          localStorage.removeItem('user_2fa_method');
        }
      }
    } catch (error) {
      console.error('🔐 Error leyendo método 2FA persistido:', error);
      localStorage.removeItem('user_2fa_method');
    }
    return null;
  }

  private getUserAuthTypeFromBackend(): Observable<UserAuthType> {
    const currentUser = this.authService.getCurrentUserValue();
    if (!currentUser) {
      return of({
        hasGoogleAuth: false,
        hasEmailBackup: true,
        authType: DobleAutenticacionTipo.TOKEN_SEGURIDAD
      });
    }

    const endpoint = `${this.apiUrl}/auth/2fa-status/${currentUser.usuario}`;
    
    return this.http.get<any>(endpoint, {
      headers: {
        'Authorization': `Bearer ${this.authService.getToken()}`,
        'Content-Type': 'application/json'
      }
    }).pipe(
      map(response => ({
        hasGoogleAuth: response.hasGoogleAuth || false,
        hasEmailBackup: response.hasEmailBackup || true,
        authType: response.hasGoogleAuth ? 
          DobleAutenticacionTipo.GOOGLE_AUTHENTICATOR : 
          DobleAutenticacionTipo.TOKEN_SEGURIDAD
      })),
      catchError(() => of({
        hasGoogleAuth: false,
        hasEmailBackup: true,
        authType: DobleAutenticacionTipo.TOKEN_SEGURIDAD
      }))
    );
  }

  /**
   * Valida un token de autenticación
   */
  validateToken(request: TokenValidationRequest): Observable<TokenValidationResponse> {
    const currentUser = this.authService.getCurrentUserValue();
    if (!currentUser) {
      return of({ success: false, message: 'Usuario no autenticado', valid: false });
    }

    // Usar tempToken si está disponible
    const tempToken = request.tempToken || this.authService.getTempToken?.();
    if (tempToken) {
      return this.validateWithTempToken(request.token, tempToken, request.action);
    }

    // Validar usando el método 2FA del usuario
    return this.getUserAuthType().pipe(
      switchMap(authType => this.validate2FACode(request.token, authType.authType!)),
      catchError(error => of({ 
        success: false, 
        message: 'Error en validación: ' + (error.message || 'Error desconocido'), 
        valid: false 
      }))
    );
  }

  /**
   * Valida código 2FA usando el endpoint de login
   */
  private validate2FACode(code: string, authType: DobleAutenticacionTipo): Observable<TokenValidationResponse> {
    const currentUser = this.authService.getCurrentUserValue();
    if (!currentUser) {
      return of({ 
        success: false, 
        message: 'Usuario no autenticado', 
        valid: false 
      });
    }

    const endpoint = `${this.apiUrl}/auth/validate-2fa`;
    const payload = {
      usuario: currentUser.usuario,
      codigo2FA: code
    };
    
    const authTypeName = authType === DobleAutenticacionTipo.GOOGLE_AUTHENTICATOR ? 'Google Authenticator' : 'email';
    
    return this.http.post<any>(endpoint, payload, {
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.authService.getToken()}`
      }
    }).pipe(
      map(response => ({
        success: response.success || response.valid || false,
        message: response.success || response.valid ? 
          `Código ${authTypeName} validado exitosamente` : 
          `Código ${authTypeName} inválido`,
        valid: response.success || response.valid || false
      })),
      catchError(error => of({ 
        success: false, 
        message: error.status === 401 || error.status === 403 ? 
          `Código ${authTypeName} inválido` : 
          'Error de conexión con el servidor', 
        valid: false 
      }))
    );
  }


  /**
   * Envía código por email para aprobación
   */
  sendEmailCode(documentId: string | number | null | undefined, action: 'approve' | 'reject'): Observable<{ success: boolean; message: string }> {
    const currentUser = this.authService.getCurrentUserValue();
    if (!currentUser) {
      return of({ success: false, message: 'Usuario no autenticado' });
    }

    const endpoint = `${this.apiUrl}/auth/send-email-code`;
    const payload = { usuario: currentUser.usuario };
    
    return this.http.post<{ message: string }>(endpoint, payload, {
      headers: { 'Content-Type': 'application/json' }
    }).pipe(
      map(response => ({ 
        success: true, 
        message: response.message || 'Código enviado exitosamente' 
      })),
      catchError(error => of({ 
        success: false, 
        message: error.status === 400 ? 'Error en los datos enviados' :
                error.status === 500 ? 'Error del servidor. Intente más tarde.' :
                error.status === 401 ? 'Usuario no autenticado' :
                'Error de conexión. Intente nuevamente.'
      }))
    );
  }

  /**
   * Obtiene el texto de instrucciones según el tipo de autenticación
   */
  getInstructionsText(authType: DobleAutenticacionTipo): string[] {
    switch (authType) {
      case DobleAutenticacionTipo.GOOGLE_AUTHENTICATOR:
        return [
          'Ingrese a la App.',
          'Por favor ingrese el código que le indica el aplicativo de "Google Authenticator".',
          'Clic en el botón "Validar con Google".',
          'Este código se actualiza cada 30 segundos y expira en 90 segundos.'
        ];
      case DobleAutenticacionTipo.TOKEN_SEGURIDAD:
        return [
          'Se ha enviado un código de verificación a su correo electrónico.',
          'Por favor ingrese el código de 6 dígitos que recibió.',
          'El código expira en 90 segundos (1 minuto y medio).'
        ];
      default:
        return [
          'Ingrese el código de verificación.',
          'El código expira en 90 segundos (1 minuto y medio).'
        ];
    }
  }

  /**
   * Obtiene el texto del botón según el tipo de autenticación
   */
  getButtonText(authType: DobleAutenticacionTipo): string {
    switch (authType) {
      case DobleAutenticacionTipo.GOOGLE_AUTHENTICATOR:
        return 'Validar con Google';
      case DobleAutenticacionTipo.TOKEN_SEGURIDAD:
        return 'Validar Código';
      default:
        return 'Validar';
    }
  }

  /**
   * Obtiene la duración del timer según el tipo de autenticación
   */
  getTimerDuration(authType: DobleAutenticacionTipo): number {
    // Ambos tipos de autenticación usan 90 segundos (1 minuto y medio)
    return 90;
  }


  /**
   * Valida código 2FA usando tempToken específico para aprobaciones
   */
  private validateWithTempToken(code: string, tempToken: string, action: string): Observable<TokenValidationResponse> {
    const currentUser = this.authService.getCurrentUserValue();
    if (!currentUser) {
      return throwError(() => new Error('No hay usuario actual'));
    }

    const endpoint = `${this.apiUrl}/auth/validate-2fa`;
    const payload = {
      tempToken: tempToken,
      codigo2FA: code
    };

    return this.http.post<any>(endpoint, payload, {
      headers: { 'Content-Type': 'application/json' }
    }).pipe(
      map(response => {
        // Caso 1: backend devuelve flags explícitos
        if (response?.success === true || response?.valid === true) {
          return {
            success: true,
            valid: true,
            message: response.message || 'Código validado correctamente'
          };
        }

        // Caso 2: backend devuelve token y usuario (mismo formato del login)
        if (response?.token && response?.usuario) {
          try {
            localStorage.setItem('auth_token', response.token);
          } catch {}
          return {
            success: true,
            valid: true,
            message: 'Código validado correctamente'
          };
        }

        // Caso 3: cualquier otra respuesta
        return {
          success: Boolean(response?.success) || false,
          valid: Boolean(response?.valid) || false,
          message: response?.message || 'Validación completada'
        };
      }),
      catchError(error => {
        // Fallback: si el tempToken está inválido/expirado intentar validación directa
        if (error?.status === 401 || error?.error?.code === 'TOKEN_INVALIDO') {
          return this.getUserAuthType().pipe(
            switchMap(authType => this.validate2FACode(code, authType.authType!))
          );
        }

        return throwError(() => error);
      })
    );
  }


}