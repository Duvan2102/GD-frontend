import { Injectable } from '@angular/core';
import { Observable, of, BehaviorSubject, throwError } from 'rxjs';
import { HttpClient } from '@angular/common/http';
import { map, catchError } from 'rxjs/operators';
import { Usuario, LoginRequest, AuthResponse, UsuarioData, AuthErrorResponse, MessageResponse, PasswordValidationRequest, PasswordValidationResponse, TwoFARequest, TwoFAResponse, TwoFARequiredResponse, TwoFAErrorResponse, TwoFAStatusResponse, QRCodeResponse, GoogleAuthSetupResponse, GoogleAuthConfirmRequest, GoogleAuthConfirmResponse, UnlinkGoogleAuthRequest, UnlinkGoogleAuthResponse, EmailCodeRequest, EmailCodeResponse, TwoFAState, QRSetupData, Change2FAMethodRequest, Change2FAMethodResponse, RegisterRequest, RegisterResponse, RegisterErrorResponse } from '../interfaces/common.interfaces';
import { Position } from './positions.service';
import { environment } from '../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private apiUrl = environment.apiUrl;
  private tokenKey = 'auth_token';

  private currentUserSubject = new BehaviorSubject<UsuarioData | null>(null);
  private currentUser: UsuarioData | null = null;

  private tempTokenKey = 'temp_token';
  private twoFARequiredSubject = new BehaviorSubject<boolean>(false);
  private twoFAUserSubject = new BehaviorSubject<string>('');
  private twoFAStateSubject = new BehaviorSubject<TwoFAState | null>(null);

  constructor(private http: HttpClient) {
    this.initializeAuth();
  }

  private initializeAuth(): void {
    const token = localStorage.getItem(this.tokenKey);

    if (token) {
      this.loadUserFromToken();
    }
  }

  private loadUserFromToken(): void {
    if (this.currentUser) {
      return;
    }
    this.validateTokenAndLoadUser().subscribe({
      next: (user) => {
        if (user) {
          this.currentUser = user;
          this.currentUserSubject.next(user);
        }
      },
      error: () => {
        this.clearAuthData();
      }
    });
  }

  private hasStoredUserData(): boolean {
    const storedUser = localStorage.getItem('current_user_data');
    return storedUser !== null;
  }

  private validateTokenAndLoadUser(): Observable<UsuarioData | null> {
    const token = this.getToken();
    if (!token) {
      return of(null);
    }

    const storedUser = localStorage.getItem('current_user_data');
    if (storedUser) {
      try {
        const userData = JSON.parse(storedUser);
        if (userData.rol && !Array.isArray(userData.rol)) {
          userData.rol = [0];
        } else if (!userData.rol) {
          userData.rol = [0];
        }
        return of(userData);
      } catch {
        this.clearAuthData();
        return of(null);
      }
    }

    return of(null);
  }

  private convertMockUserToUsuarioData(mockUser: Usuario & { cargoCompleto: Position }): UsuarioData {
    let rolArray: number[] = [0];
    
    if (Array.isArray(mockUser.rol)) {
      rolArray = mockUser.rol.filter((r: any) => typeof r === 'number');
      if (!rolArray.includes(0)) {
        rolArray.unshift(0);
      }
    } else if (mockUser.rol && typeof mockUser.rol === 'object' && 'idRol' in mockUser.rol) {
      const rolId = (mockUser.rol as any).idRol;
      rolArray = [0];
      if (rolId === 1) {
        rolArray.push(1, 3);
      } else if (rolId === 3) {
        rolArray.push(2);
      }
    }
    
    return {
      idUsuario: mockUser.idUsuario || mockUser.noUsuario || 0,
      identificacion: mockUser.identificacion,
      nombres: mockUser.nombres,
      apellidos: mockUser.apellidos,
      usuario: mockUser.usuario,
      correoEmpresarial: mockUser.correoEmpresarial || '',
      correoPersonal: mockUser.correoPersonal,
      telefono1: mockUser.telefono1 || '',
      telefono2: mockUser.telefono2,
      direccion: mockUser.direccion,
      cargo: {
        idCargo: mockUser.cargoCompleto.idCargo || 0,
        descripcion: mockUser.cargoCompleto.descripcion,
        area: mockUser.cargoCompleto.area.descripcion,
        departamento: mockUser.cargoCompleto.area.departamento?.descripcion || ''
      },
      rol: rolArray,
      estado: mockUser.estado?.descripcion || '',
      tipologias: []
    };
  }

  getCurrentUser(): Observable<UsuarioData | null> {
    return this.currentUserSubject.asObservable();
  }

  getCurrentUserValue(): UsuarioData | null {
    return this.currentUser;
  }

  updateCurrentUser(updatedUserData: UsuarioData): Observable<UsuarioData> {
    this.currentUser = { ...this.currentUser, ...updatedUserData };
    this.currentUserSubject.next(this.currentUser);
    
    // Guardar en localStorage para persistencia
    localStorage.setItem('current_user_data', JSON.stringify(this.currentUser));
    
    return of(this.currentUser);
  }

  canAccessAdmin(): boolean {
    if (!this.currentUser?.rol) {
      return false;
    }
    
    if (Array.isArray(this.currentUser.rol)) {
      return this.currentUser.rol.includes(3);
    }
    
    if (typeof this.currentUser.rol === 'string') {
      return this.currentUser.rol.toLowerCase().includes('administrador');
    }
    
    return false;
  }


  canAccessUsers(): boolean {
    if (!this.currentUser?.rol) {
      return false;
    }
    
    if (Array.isArray(this.currentUser.rol)) {
      return this.currentUser.rol.includes(1);
    }
    
    if (typeof this.currentUser.rol === 'string') {
      return this.currentUser.rol.toLowerCase().includes('administrador');
    }
    
    return false;
  }

  canAccessReports(): boolean {
    if (!this.currentUser?.rol) {
      return false;
    }
    
    if (Array.isArray(this.currentUser.rol)) {
      return this.currentUser.rol.includes(2);
    }
    
    if (typeof this.currentUser.rol === 'string') {
      return this.currentUser.rol.toLowerCase().includes('auditor');
    }
    
    return false;
  }

  login(username: string, password: string): Observable<boolean> {
    const loginRequest: LoginRequest = {
      usuario: username,
      password: password
    };

    return this.http.post<AuthResponse>(`${this.apiUrl}/auth/login`, loginRequest)
      .pipe(
        map((response: AuthResponse) => {
          localStorage.setItem(this.tokenKey, response.token);

          if (response.usuario.rol && !Array.isArray(response.usuario.rol)) {
            response.usuario.rol = [0];
          } else if (!response.usuario.rol) {
            response.usuario.rol = [0];
          }

          this.currentUser = response.usuario;
          this.currentUserSubject.next(this.currentUser);

          localStorage.setItem('current_user_data', JSON.stringify(this.currentUser));

          return true;
        }),
        catchError((error: any) => {
          console.error('Error en login:', error);
          return throwError(() => error);
        })
      );
  }

  logout(): Observable<boolean> {
    const token = localStorage.getItem(this.tokenKey);

    if (token) {
      return this.http.post<MessageResponse>(`${this.apiUrl}/auth/logout`, {}, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      }).pipe(
        map(() => {
          this.clearAuthData();
          return true;
        }),
        catchError((error: any) => {
          this.clearAuthData();
          return throwError(() => error);
        })
      );
    } else {
      this.clearAuthData();
      return of(true);
    }
  }

  private clearAuthData(): void {
    localStorage.removeItem(this.tokenKey);
    localStorage.removeItem('current_user_data');
    localStorage.removeItem(this.tempTokenKey);
    localStorage.removeItem('user_2fa_method');
    this.currentUser = null;
    this.currentUserSubject.next(null);
  }

  logoutSync(): void {
    this.clearAuthData();
  }

  isAuthenticated(): boolean {
    const hasUser = this.currentUser !== null;
    const hasToken = this.getToken() !== null;
    const hasStoredUser = this.hasStoredUserData();
    const isActive = this.currentUser?.estado === 'Activo' || this.currentUser?.estado === 'ACTIVO' || this.currentUser?.estado === 'activo';

    const result = hasToken && (hasUser || hasStoredUser) && (isActive || !this.currentUser?.estado);

    return result;
  }

  getToken(): string | null {
    return localStorage.getItem(this.tokenKey);
  }

  validatePassword(password: string): Observable<PasswordValidationResponse> {
    const token = this.getToken();
    if (!token) {
      return throwError(() => new Error('Usuario no autenticado'));
    }

    const request: PasswordValidationRequest = { password };

    return this.http.post<PasswordValidationResponse>(`${this.apiUrl}/auth/validate-password`, request, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    }).pipe(
      catchError((error: any) => {
        if (error.status === 401) {
          return of({
            valid: false,
            message: 'Contraseña incorrecta'
          });
        }
        return throwError(() => error);
      })
    );
  }

  getTwoFARequired(): Observable<boolean> {
    return this.twoFARequiredSubject.asObservable();
  }

  getTwoFAUser(): Observable<string> {
    return this.twoFAUserSubject.asObservable();
  }

  getTwoFAState(): Observable<TwoFAState | null> {
    return this.twoFAStateSubject.asObservable();
  }

  isTwoFARequired(): boolean {
    return this.twoFARequiredSubject.value;
  }

  getTempToken(): string | null {
    return localStorage.getItem(this.tempTokenKey);
  }

  private setTempToken(token: string): void {
    localStorage.setItem(this.tempTokenKey, token);
  }

  private clearTempToken(): void {
    localStorage.removeItem(this.tempTokenKey);
  }

  loginWith2FA(username: string, password: string): Observable<{ success: boolean; requires2FA: boolean; tempToken: string; user: string; qrCodeUrl?: string; secret?: string; requiereConfiguracion?: boolean; dobleAutenticacion?: boolean }> {
    const loginRequest: LoginRequest = {
      usuario: username,
      password: password
    };

    return this.http.post<TwoFARequiredResponse>(`${this.apiUrl}/auth/login`, loginRequest)
      .pipe(
        map((response: TwoFARequiredResponse) => {
          this.setTempToken(response.tempToken);
          this.twoFARequiredSubject.next(true);
          this.twoFAUserSubject.next(response.usuario);

          return {
            success: true,
            requires2FA: true,
            tempToken: response.tempToken,
            user: response.usuario,
            dobleAutenticacion: response.dobleAutenticacion
          };
        }),
        catchError((error: any) => throwError(() => error))
      );
  }

  check2FAStatus(): Observable<TwoFAStatusResponse> {
    const currentUser = this.twoFAUserSubject.value;

    if (!currentUser) {
      return throwError(() => new Error('Usuario no encontrado'));
    }

    return this.http.get<TwoFAStatusResponse>(`${this.apiUrl}/auth/2fa-status/${currentUser}`).pipe(
      map((response: TwoFAStatusResponse) => {
        let metodoActual: 'GOOGLE_AUTH' | 'EMAIL' | 'PENDING';
        
        if (response.hasEmailBackup) {
          metodoActual = 'EMAIL';
        } else if (response.hasGoogleAuth) {
          metodoActual = 'GOOGLE_AUTH';
        } else if (response.googleAuthPending) {
          metodoActual = 'PENDING';
        } else {
          metodoActual = 'GOOGLE_AUTH';
        }
        
        const state: TwoFAState = {
          hasGoogleAuth: response.hasGoogleAuth,
          hasEmailBackup: response.hasEmailBackup,
          googleAuthPending: response.googleAuthPending,
          isConfigured: response.hasGoogleAuth || response.hasEmailBackup,
          needsSetup: response.googleAuthPending || (!response.hasGoogleAuth && !response.hasEmailBackup),
          metodoActual: metodoActual
        };
        
        this.twoFAStateSubject.next(state);
        return response;
      }),
      catchError((error: any) => throwError(() => error))
    );
  }

  getQRCode(): Observable<QRSetupData> {
    const currentUser = this.twoFAUserSubject.value;

    if (!currentUser) {
      return throwError(() => new Error('Usuario no encontrado'));
    }

    const request = { usuario: currentUser };

    return this.http.post<QRCodeResponse>(`${this.apiUrl}/auth/get-google-auth-qr`, request, {
      headers: {
        'Content-Type': 'application/json'
      }
    }).pipe(
      map((response: QRCodeResponse) => {
        return {
          qrCodeUrl: response.qrCodeUrl,
          secret: response.secret,
          isNew: response.message.includes('Nuevo'),
          message: response.message
        };
      }),
      catchError((error: any) => throwError(() => error))
    );
  }

  validate2FACode(codigo: string): Observable<{ success: boolean; qrCodeUrl?: string; secret?: string; message?: string; errorCode?: string; errorType?: 'GOOGLE_AUTH' | 'EMAIL' | 'METHOD_INCORRECT' | 'PENDING_SETUP' }> {
    const tempToken = this.getTempToken();
    if (!tempToken) {
      return throwError(() => new Error('Token temporal no encontrado'));
    }

    const request = {
      tempToken: tempToken,
      codigo2FA: codigo
    };

    return this.http.post<any>(`${this.apiUrl}/auth/validate-2fa`, request, {
      headers: {'Content-Type': 'application/json'},
      observe: 'response'
    }).pipe(
        map((response: any) => {
          const body = response.body;
          const status = response.status;
          
          if (status === 202 && body.qrCodeUrl && body.secret) {
            return {
              success: false,
              qrCodeUrl: body.qrCodeUrl,
              secret: body.secret,
              message: body.message || 'Debes configurar Google Authenticator',
              errorType: 'PENDING_SETUP' as const
            };
          }
          
          if (status === 200 && body.token && body.usuario) {
            localStorage.setItem(this.tokenKey, body.token);
            
            if (body.usuario.rol && !Array.isArray(body.usuario.rol)) {
              body.usuario.rol = [0];
            } else if (!body.usuario.rol) {
              body.usuario.rol = [0];
            }
            
            this.currentUser = body.usuario;
            this.currentUserSubject.next(this.currentUser);
            localStorage.setItem('current_user_data', JSON.stringify(this.currentUser));

            const current2FAState = this.twoFAStateSubject.value;
            if (current2FAState) {
              localStorage.setItem('user_2fa_method', JSON.stringify({
                hasGoogleAuth: current2FAState.hasGoogleAuth,
                hasEmailBackup: current2FAState.hasEmailBackup,
                metodoActual: current2FAState.metodoActual,
                timestamp: Date.now()
              }));
            }

            this.twoFARequiredSubject.next(false);
            this.twoFAUserSubject.next('');

            return { success: true };
          }

          if (body.qrCodeUrl && body.secret) {
            return {
              success: false,
              qrCodeUrl: body.qrCodeUrl,
              secret: body.secret,
              message: body.message
            };
          }

          return { success: false, message: 'Respuesta inesperada del servidor' };
        }),
        catchError((error: any) => {
          if (error.error) {
            const errorMessage = error.error.message || '';
            const errorCode = error.error.code || '';
            
            if (errorCode === 'CODIGO_2FA_INVALIDO') {
              if (errorMessage.includes('Google Authenticator')) {
                error.errorType = 'GOOGLE_AUTH';
                error.userMessage = 'Código de Google Authenticator incorrecto. Verifica el código de 6 dígitos en tu aplicación.';
              } else if (errorMessage.includes('email')) {
                error.errorType = 'EMAIL';
                error.userMessage = 'Código de email incorrecto. Revisa tu correo e ingresa el código correcto.';
              } else {
                error.userMessage = 'Código de verificación incorrecto';
              }
            } else if (errorCode === '2FA_METHOD_INCORRECT') {
              error.errorType = 'METHOD_INCORRECT';
              if (errorMessage.includes('Google Authenticator')) {
                error.userMessage = 'Tu método activo es Google Authenticator. Usa el código de tu aplicación, no el código de email.';
              } else if (errorMessage.includes('email')) {
                error.userMessage = 'Tu método activo es Email. Solicita un código por correo, no uses Google Authenticator.';
              } else {
                error.userMessage = errorMessage;
              }
            } else if (errorCode === 'TOKEN_INVALIDO') {
              error.userMessage = 'Tu sesión ha expirado. Por favor, inicia sesión nuevamente.';
            } else if (errorMessage) {
              if (errorMessage.toLowerCase().includes('user is disabled')) {
                error.userMessage = 'Usuario deshabilitado. Contacta al administrador.';
              } else {
                error.userMessage = errorMessage;
              }
            }
          }
          
          return throwError(() => error);
        })
      );
  }

  sendEmailCode(): Observable<EmailCodeResponse> {
    const currentUser = this.twoFAUserSubject.value;
    if (!currentUser) {
      return throwError(() => new Error('Usuario no encontrado'));
    }

    const request = { usuario: currentUser };

    return this.http.post<EmailCodeResponse>(`${this.apiUrl}/auth/send-email-code`, request, {
      headers: {'Content-Type': 'application/json'}
    }).pipe(
        catchError((error: any) => {
          const errorCode = error.error?.code || '';
          const errorMessage = error.error?.message || '';
          
          if (errorCode === '2FA_METHOD_INCORRECT') {
            error.errorType = 'METHOD_INCORRECT';
            error.userMessage = 'Tu método activo es Google Authenticator. Usa el código de tu aplicación, no solicites código por email.';
            error.correctMethod = 'GOOGLE_AUTH';
          } else if (errorCode === 'CODIGO_EXISTENTE') {
            error.errorType = 'CODE_EXISTS';
            error.userMessage = errorMessage || 'Ya existe un código válido. Revisa tu correo o espera a que expire.';
            error.rateLimited = true;
          } else if (errorCode === 'LIMITE_EXCEDIDO') {
            error.errorType = 'RATE_LIMITED';
            error.userMessage = errorMessage || 'Has excedido el límite de intentos. Por favor, intenta más tarde.';
            error.rateLimited = true;
          } else if (errorCode === '2FA_DISABLED') {
            error.userMessage = 'La autenticación de dos factores no está habilitada para este usuario.';
          } else if (errorCode === 'EMAIL_NOT_CONFIGURED') {
            error.userMessage = 'El correo electrónico no está configurado. Contacta al administrador.';
          } else if (error.status === 400 && !errorMessage) {
            error.userMessage = 'No se pudo enviar el código por correo. Verifica tu configuración.';
          } else if (error.status === 429) {
            error.errorType = 'RATE_LIMITED';
            error.userMessage = errorMessage || 'Demasiados intentos. Por favor, espera unos minutos.';
            error.rateLimited = true;
          } else {
            if (errorMessage && errorMessage.toLowerCase().includes('user is disabled')) {
              error.userMessage = 'Usuario deshabilitado. Contacta al administrador.';
            } else {
              error.userMessage = errorMessage || 'Error enviando código por email';
            }
          }
          
          return throwError(() => error);
        })
      );
  }

  setupGoogleAuthenticator(): Observable<GoogleAuthSetupResponse> {
    const currentUser = this.twoFAUserSubject.value;

    if (!currentUser) {
      return throwError(() => new Error('Usuario no encontrado'));
    }

    const request = { usuario: currentUser };

    return this.http.post<GoogleAuthSetupResponse>(`${this.apiUrl}/auth/setup-google-auth`, request, {
      headers: {
        'Content-Type': 'application/json'
      }
    }).pipe(
      catchError((error: any) => throwError(() => error))
    );
  }

  confirmGoogleAuthenticator(codigo: string, secret: string): Observable<GoogleAuthConfirmResponse> {
    const currentUser = this.twoFAUserSubject.value;

    if (!currentUser) {
      return throwError(() => new Error('Usuario no encontrado'));
    }

    const request = {
      usuario: currentUser,
      secret: secret,
      codigo: codigo
    };

    return this.http.post<GoogleAuthConfirmResponse>(`${this.apiUrl}/auth/confirm-google-auth`, request, {
      headers: {'Content-Type': 'application/json'}
    }).pipe(
      map((response: GoogleAuthConfirmResponse) => {
        this.check2FAStatus().subscribe();
        return response;
      }),
      catchError((error: any) => {
        const errorCode = error.error?.code || '';
        const errorMessage = error.error?.message || '';
        
        if (errorCode === '2FA_METHOD_INCORRECT') {
          error.errorType = 'METHOD_INCORRECT';
          error.userMessage = 'Google Authenticator no está configurado como tu método activo. Cambia tu método 2FA primero.';
        } else if (errorCode === 'CODIGO_INVALIDO') {
          error.userMessage = 'Código de Google Authenticator incorrecto. Verifica el código de 6 dígitos en tu aplicación.';
        } else {
          error.userMessage = errorMessage || 'Error confirmando Google Authenticator';
        }
        
        return throwError(() => error);
      })
    );
  }

  unlinkGoogleAuthenticator(password: string): Observable<UnlinkGoogleAuthResponse> {
    const currentUser = this.twoFAUserSubject.value;

    if (!currentUser) {
      return throwError(() => new Error('Usuario no encontrado'));
    }

    const request = {
      usuario: currentUser,
      password: password
    };

    return this.http.post<UnlinkGoogleAuthResponse>(`${this.apiUrl}/auth/remove-google-auth`, request, {
      headers: {
        'Content-Type': 'application/json'
      }
    }).pipe(
      map((response: UnlinkGoogleAuthResponse) => {
        this.check2FAStatus().subscribe();
        return response;
      }),
      catchError((error: any) => throwError(() => error))
    );
  }

  clear2FAState(): void {
    this.twoFARequiredSubject.next(false);
    this.twoFAUserSubject.next('');
    this.twoFAStateSubject.next(null);
  }

  clearTempTokenOnly(): void {
    this.clearTempToken();
  }

  getCurrent2FAState(): TwoFAState | null {
    return this.twoFAStateSubject.value;
  }

  getLoginStats(): Observable<{ message: string }> {
    const tempToken = this.getTempToken();
    if (!tempToken) {
      return throwError(() => new Error('Token temporal no encontrado'));
    }

    return this.http.get<{ message: string }>(`${this.apiUrl}/auth/login-stats`, {
      headers: {
        'Authorization': `Bearer ${tempToken}`
      }
    }).pipe(
      catchError((error: any) => throwError(() => error))
    );
  }

  unlockUser(): Observable<{ message: string }> {
    const tempToken = this.getTempToken();
    if (!tempToken) {
      return throwError(() => new Error('Token temporal no encontrado'));
    }

    return this.http.post<{ message: string }>(`${this.apiUrl}/auth/unlock-user`, {}, {
      headers: {
        'Authorization': `Bearer ${tempToken}`
      }
    }).pipe(
      catchError((error: any) => throwError(() => error))
    );
  }

  removeUserQR(usuario: string, password: string): Observable<{ message: string }> {
    const token = this.getToken();
    if (!token) {
      return throwError(() => new Error('Token no encontrado'));
    }

    const request = {
      usuario: usuario,
      password: password
    };

    return this.http.post<{ message: string }>(`${this.apiUrl}/auth/remove-google-auth`, request, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    }).pipe(
      catchError((error: any) => throwError(() => error))
    );
  }

  change2FAMethod(idUsuario: number, nuevoMetodo: 'EMAIL' | 'GOOGLE_AUTH'): Observable<Change2FAMethodResponse> {
    const token = this.getToken();
    if (!token) {
      return throwError(() => new Error('Token no encontrado'));
    }

    const request: Change2FAMethodRequest = {
      idUsuario: idUsuario,
      nuevoMetodo: nuevoMetodo
    };

    return this.http.post<Change2FAMethodResponse>(`${this.apiUrl}/auth/change-2fa-method`, request, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    }).pipe(
      map((response: Change2FAMethodResponse) => {
        // Si el método cambió exitosamente, actualizar el usuario actual
        if (this.currentUser) {
          this.currentUser.tokenQr = nuevoMetodo === 'GOOGLE_AUTH';
          this.currentUser.tokenCorreo = nuevoMetodo === 'EMAIL';
          this.currentUser.dobleAutenticacion = nuevoMetodo;
          this.currentUserSubject.next(this.currentUser);
          localStorage.setItem('current_user_data', JSON.stringify(this.currentUser));
        }
        return response;
      }),
      catchError((error: any) => throwError(() => error))
    );
  }

  register(body: RegisterRequest): Observable<RegisterResponse> {
    return this.http.post<RegisterResponse>(`${this.apiUrl}/auth/register`, body, {
      headers: {
        'Content-Type': 'application/json'
      }
    }).pipe(
      catchError((error: any) => throwError(() => error))
    );
  }
}
