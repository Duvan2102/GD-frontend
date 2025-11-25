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
  requiresLogout?: boolean;
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

  getUserAuthType(): Observable<UserAuthType> {
    const currentUser = this.authService.getCurrentUserValue();
    if (!currentUser) {
      return of({
        hasGoogleAuth: false,
        hasEmailBackup: true,
        authType: DobleAutenticacionTipo.TOKEN_SEGURIDAD
      });
    }

    const persisted2FA = this.getPersisted2FAMethod();
    if (persisted2FA) {
      let authType: DobleAutenticacionTipo;
      
      if (persisted2FA.hasEmailBackup) {
        authType = DobleAutenticacionTipo.TOKEN_SEGURIDAD;
      } else if (persisted2FA.hasGoogleAuth) {
        authType = DobleAutenticacionTipo.GOOGLE_AUTHENTICATOR;
      } else {
        authType = DobleAutenticacionTipo.TOKEN_SEGURIDAD;
      }
      
      return of({
        hasGoogleAuth: persisted2FA.hasGoogleAuth || false,
        hasEmailBackup: persisted2FA.hasEmailBackup || true,
        authType: authType
      });
    }

    return this.authService.getTwoFAState().pipe(
      switchMap(twoFAState => {
        if (twoFAState) {
          let authType: DobleAutenticacionTipo;
          
          if (twoFAState.hasEmailBackup) {
            authType = DobleAutenticacionTipo.TOKEN_SEGURIDAD;
          } else if (twoFAState.hasGoogleAuth) {
            authType = DobleAutenticacionTipo.GOOGLE_AUTHENTICATOR;
          } else {
            authType = DobleAutenticacionTipo.TOKEN_SEGURIDAD;
          }
          
          return of({
            hasGoogleAuth: twoFAState.hasGoogleAuth || false,
            hasEmailBackup: twoFAState.hasEmailBackup || true,
            authType: authType
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
        const now = Date.now();
        const age = now - data.timestamp;
        const maxAge = 24 * 60 * 60 * 1000;

        if (age < maxAge) {
          return data;
        } else {
          localStorage.removeItem('user_2fa_method');
        }
      }
    } catch (error) {
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
      map(response => {
        let authType: DobleAutenticacionTipo;
        
        if (response.hasEmailBackup) {
          authType = DobleAutenticacionTipo.TOKEN_SEGURIDAD;
        } else if (response.hasGoogleAuth) {
          authType = DobleAutenticacionTipo.GOOGLE_AUTHENTICATOR;
        } else {
          authType = DobleAutenticacionTipo.TOKEN_SEGURIDAD;
        }

        return {
          hasGoogleAuth: response.hasGoogleAuth || false,
          hasEmailBackup: response.hasEmailBackup || true,
          authType: authType
        };
      }),
      catchError((error) => {
        return of({
          hasGoogleAuth: false,
          hasEmailBackup: true,
          authType: DobleAutenticacionTipo.TOKEN_SEGURIDAD
        });
      })
    );
  }

  validateToken(request: TokenValidationRequest): Observable<TokenValidationResponse> {
    const currentUser = this.authService.getCurrentUserValue();
    
    if (!currentUser) {
      return of({ success: false, message: 'Usuario no autenticado', valid: false });
    }

    const tempToken = request.tempToken || this.authService.getTempToken();
    
    if (tempToken) {
      return this.validateWithTempToken(request.token, tempToken, request.action, request.documentId);
    }

    return of({
      success: false,
      valid: false,
      message: 'Sesión expirada. Debe cerrar sesión e iniciar sesión nuevamente.',
      requiresLogout: true
    });
  }

  sendEmailCode(documentId: string | number | null | undefined, action: 'approve' | 'reject'): Observable<{ success: boolean; message: string }> {
    const currentUser = this.authService.getCurrentUserValue();
    if (!currentUser) {
      return of({ success: false, message: 'Usuario no autenticado' });
    }

    const tempToken = this.authService.getTempToken();
    if (!tempToken) {
      return of({ 
        success: false, 
        message: 'Sesión expirada. Debe cerrar sesión e iniciar sesión nuevamente.' 
      });
    }

    const endpoint = `${this.apiUrl}/auth/send-email-code`;
    const payload = {
      tempToken: tempToken,
      usuario: currentUser.usuario,
      documentId: documentId,
      action: action
    };

    return this.http.post<{ message: string }>(endpoint, payload, {
      headers: { 'Content-Type': 'application/json' }
    }).pipe(
      map(response => {
        return {
          success: true,
          message: response.message || 'Código enviado exitosamente'
        };
      }),
      catchError(error => {
        return of({
          success: false,
          message: error.status === 400 ? 'Error en los datos enviados' :
                  error.status === 500 ? 'Error del servidor. Intente más tarde.' :
                  error.status === 401 ? 'Sesión expirada. Debe cerrar sesión e iniciar sesión nuevamente.' :
                  'Error de conexión. Intente nuevamente.'
        });
      })
    );
  }

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

  getTimerDuration(authType: DobleAutenticacionTipo): number {
    return 90;
  }


  private validateWithTempToken(code: string, tempToken: string, action: string, documentId?: string | number): Observable<TokenValidationResponse> {
    const currentUser = this.authService.getCurrentUserValue();
    if (!currentUser) {
      return throwError(() => new Error('No hay usuario actual'));
    }

    const endpoint = documentId 
      ? `${this.apiUrl}/${documentId}/validar-2fa`
      : `${this.apiUrl}/auth/validate-2fa`;
    const payload = {
      codigo2FA: code
    };

    return this.http.post<any>(endpoint, payload, {
      headers: { 'Content-Type': 'application/json' }
    }).pipe(
      map(response => {
        if (response?.success === true || response?.valid === true) {
          return {
            success: true,
            valid: true,
            message: response.message || 'Código validado correctamente'
          };
        }

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

        return {
          success: Boolean(response?.success) || false,
          valid: Boolean(response?.valid) || false,
          message: response?.message || 'Validación completada'
        };
      }),
      catchError(error => {
        if (error?.status === 401 || 
            error?.error?.code === 'TOKEN_INVALIDO' || 
            error?.error?.message?.includes('token') ||
            error?.error?.message?.includes('expired') ||
            error?.error?.message?.includes('invalid')) {
          
          this.authService.clearTempTokenOnly();
          
          return of({
            success: false,
            valid: false,
            message: 'Sesión expirada. Debe cerrar sesión e iniciar sesión nuevamente.',
            requiresLogout: true
          });
        }

        return of({
          success: false,
          valid: false,
          message: 'Error de conexión. Intente nuevamente.'
        });
      })
    );
  }
}