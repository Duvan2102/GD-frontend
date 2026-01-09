import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subject, takeUntil } from 'rxjs';
import { AuthService } from '../../services/auth.service';
import { Router } from '@angular/router';
import { TwoFAState } from '../../interfaces/common.interfaces';

@Component({
  selector: 'app-two-fa-management',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './two-fa-management.component.html',
  styleUrls: ['./two-fa-management.component.css']
})
export class TwoFAManagementComponent implements OnInit, OnDestroy {
  errorMessage: string = '';
  successMessage: string = '';
  isLoading: boolean = false;
  currentUser: any = null;
  twoFAState: TwoFAState | null = null;
  private destroy$ = new Subject<void>();

  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  ngOnInit(): void {
    // Obtener usuario actual
    this.authService.getCurrentUser()
      .pipe(takeUntil(this.destroy$))
      .subscribe(user => {
        this.currentUser = user;
        this.load2FAStatus();
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  load2FAStatus(): void {
    if (!this.currentUser) return;
    
    let metodoActual: 'GOOGLE_AUTH' | 'EMAIL' | 'PENDING' = 'GOOGLE_AUTH';
    
    if (this.currentUser.tokenCorreo === true) {
      metodoActual = 'EMAIL';
    } else if (this.currentUser.tokenQr === true) {
      metodoActual = 'GOOGLE_AUTH';
    } else if (this.currentUser.dobleAutenticacion === 'EMAIL') {
      metodoActual = 'EMAIL';
    } else if (this.currentUser.dobleAutenticacion === 'GOOGLE_AUTH') {
      metodoActual = 'GOOGLE_AUTH';
    }
    
    this.twoFAState = {
      hasGoogleAuth: this.currentUser.tokenQr === true,
      hasEmailBackup: this.currentUser.tokenCorreo === true,
      googleAuthPending: false,
      isConfigured: true,
      needsSetup: false,
      metodoActual: metodoActual
    };
  }

  onChangeToGoogleAuth(): void {
    if (!this.currentUser) return;
    
    if (this.isGoogleAuth) {
      this.errorMessage = 'Ya estás usando Google Authenticator.';
      return;
    }
    
    this.isLoading = true;
    this.errorMessage = '';
    this.successMessage = '';

    this.authService.change2FAMethod(this.currentUser.idUsuario, 'GOOGLE_AUTH').subscribe({
      next: (response) => {
        this.successMessage = 'Método 2FA cambiado a Google Authenticator exitosamente.';
        if (response.qrCodeUrl) {
          this.successMessage += ' Deberás escanear un nuevo código QR en tu próximo inicio de sesión.';
        }
        
        this.currentUser.tokenQr = true;
        this.currentUser.tokenCorreo = false;
        this.currentUser.dobleAutenticacion = 'GOOGLE_AUTH';
        
        this.twoFAState = {
          hasGoogleAuth: true,
          hasEmailBackup: false,
          googleAuthPending: true,
          isConfigured: true,
          needsSetup: false,
          metodoActual: 'GOOGLE_AUTH'
        };
        
        localStorage.setItem('user_2fa_method', JSON.stringify({
          hasGoogleAuth: true,
          hasEmailBackup: false,
          metodoActual: 'GOOGLE_AUTH',
          timestamp: Date.now()
        }));
        
        this.isLoading = false;
      },
      error: (error: any) => {
        this.errorMessage = error.userMessage || error.error?.message || 'Error cambiando método 2FA. Por favor, intenta nuevamente.';
        this.isLoading = false;
      }
    });
  }

  onChangeToEmail(): void {
    if (!this.currentUser) return;
    
    if (this.isEmail) {
      this.errorMessage = 'Ya estás usando código por Email.';
      return;
    }
    
    this.isLoading = true;
    this.errorMessage = '';
    this.successMessage = '';

    this.authService.change2FAMethod(this.currentUser.idUsuario, 'EMAIL').subscribe({
      next: (response) => {
        this.successMessage = 'Método 2FA cambiado a Email exitosamente. Recibirás códigos de verificación por correo en tu próximo inicio de sesión.';
        
        this.currentUser.tokenQr = false;
        this.currentUser.tokenCorreo = true;
        this.currentUser.dobleAutenticacion = 'EMAIL';
        
        this.twoFAState = {
          hasGoogleAuth: false,
          hasEmailBackup: true,
          googleAuthPending: false,
          isConfigured: true,
          needsSetup: false,
          metodoActual: 'EMAIL'
        };
        
        localStorage.setItem('user_2fa_method', JSON.stringify({
          hasGoogleAuth: false,
          hasEmailBackup: true,
          metodoActual: 'EMAIL',
          timestamp: Date.now()
        }));
        
        this.isLoading = false;
      },
      error: (error: any) => {
        this.errorMessage = error.userMessage || error.error?.message || 'Error cambiando método 2FA. Por favor, intenta nuevamente.';
        this.isLoading = false;
      }
    });
  }

  get currentMethodText(): string {
    if (!this.twoFAState) return 'Cargando...';
    return this.twoFAState.metodoActual === 'GOOGLE_AUTH' 
      ? 'Google Authenticator' 
      : 'Código por Email';
  }

  get isGoogleAuth(): boolean {
    return this.twoFAState?.metodoActual === 'GOOGLE_AUTH';
  }

  get isEmail(): boolean {
    return this.twoFAState?.metodoActual === 'EMAIL';
  }
}

