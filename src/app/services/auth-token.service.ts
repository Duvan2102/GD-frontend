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
        const now = Date.now();
        const age = now - data.timestamp;
        const maxAge = 24 * 60 * 60 * 1000; // 24 horas en ms
        
        console.log('🔐 ===== VERIFICANDO MÉTODO 2FA PERSISTIDO =====');
        console.log('🔐 Timestamp del método:', new Date(data.timestamp).toISOString());
        console.log('🔐 Tiempo actual:', new Date(now).toISOString());
        console.log('🔐 Edad del método:', Math.round(age / (60 * 1000)), 'minutos');
        console.log('🔐 Límite de edad:', Math.round(maxAge / (60 * 1000)), 'minutos');
        
        if (age < maxAge) {
          console.log('🔐 ✅ Método 2FA persistido válido');
          return data;
        } else {
          console.log('🔐 ⚠️ Método 2FA persistido expirado, eliminando...');
          localStorage.removeItem('user_2fa_method');
        }
      } else {
        console.log('🔐 No hay método 2FA persistido');
      }
    } catch (error) {
      console.error('🔐 ❌ Error leyendo método 2FA persistido:', error);
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
    
    console.log('🔍 ===== VALIDANDO ESTADO 2FA =====');
    console.log('🔍 Endpoint:', endpoint);
    console.log('🔍 Usuario:', currentUser.usuario);
    console.log('🔍 Token disponible:', !!this.authService.getToken());
    
    return this.http.get<any>(endpoint, {
      headers: {
        'Authorization': `Bearer ${this.authService.getToken()}`,
        'Content-Type': 'application/json'
      }
    }).pipe(
      map(response => {
        console.log('✅ ===== RESPUESTA 2FA STATUS =====');
        console.log('✅ hasGoogleAuth:', response.hasGoogleAuth);
        console.log('✅ hasEmailBackup:', response.hasEmailBackup);
        console.log('✅ googleAuthPending:', response.googleAuthPending);
        console.log('✅ message:', response.message);
        
        const result = {
          hasGoogleAuth: response.hasGoogleAuth || false,
          hasEmailBackup: response.hasEmailBackup || true,
          authType: response.hasGoogleAuth ? 
            DobleAutenticacionTipo.GOOGLE_AUTHENTICATOR : 
            DobleAutenticacionTipo.TOKEN_SEGURIDAD
        };
        
        console.log('✅ ===== RESULTADO FINAL =====');
        console.log('✅ Tipo de autenticación:', result.authType);
        console.log('✅ Enviará correo:', result.authType === DobleAutenticacionTipo.TOKEN_SEGURIDAD);
        
        return result;
      }),
      catchError((error) => {
        console.error('❌ ===== ERROR 2FA STATUS =====');
        console.error('❌ Error:', error);
        console.log('❌ Usando fallback: TOKEN_SEGURIDAD');
        
        return of({
          hasGoogleAuth: false,
          hasEmailBackup: true,
          authType: DobleAutenticacionTipo.TOKEN_SEGURIDAD
        });
      })
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

    const tempToken = request.tempToken || this.authService.getTempToken();
    
    if (tempToken) {
      return this.validateWithTempToken(request.token, tempToken, request.action);
    }

    return of({
      success: false,
      valid: false,
      message: 'Sesión expirada. Debe cerrar sesión e iniciar sesión nuevamente.',
      requiresLogout: true
    });
  }

  // MÉTODO ELIMINADO: validate2FACode ya no se usa
  // El sistema solo debe usar tempToken, nunca usuario


  /**
   * Envía código por email para aprobación
   */
  sendEmailCode(documentId: string | number | null | undefined, action: 'approve' | 'reject'): Observable<{ success: boolean; message: string }> {
    const currentUser = this.authService.getCurrentUserValue();
    if (!currentUser) {
      return of({ success: false, message: 'Usuario no autenticado' });
    }

    // Obtener tempToken para enviar el correo
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
      usuario: currentUser.usuario,  // Agregar usuario como en el login
      documentId: documentId,
      action: action
    };
    
    console.log('📧 ===== ENVIANDO CÓDIGO POR EMAIL =====');
    console.log('📧 Endpoint:', endpoint);
    console.log('📧 DocumentId:', documentId);
    console.log('📧 Action:', action);
    console.log('📧 Usuario:', currentUser.usuario);
    console.log('📧 TempToken disponible:', !!tempToken);
    console.log('📧 Payload:', payload);
    
    return this.http.post<{ message: string }>(endpoint, payload, {
      headers: { 'Content-Type': 'application/json' }
    }).pipe(
      map(response => {
        console.log('✅ ===== CORREO ENVIADO EXITOSAMENTE =====');
        console.log('✅ Respuesta:', response);
        return { 
          success: true, 
          message: response.message || 'Código enviado exitosamente' 
        };
      }),
      catchError(error => {
        console.error('❌ ===== ERROR ENVIANDO CORREO =====');
        console.error('❌ Error:', error);
        console.error('❌ Status:', error.status);
        console.error('❌ Error body:', error.error);
        
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
          } catch (error) {
            // Error silencioso
          }
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