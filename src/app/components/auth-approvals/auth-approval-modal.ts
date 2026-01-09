import { Component, Input, Output, EventEmitter, OnDestroy, OnInit, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { AuthTokenService, TokenValidationRequest, TokenValidationResponse, UserAuthType } from '../../services/auth-token.service';
import { AuthService } from '../../services/auth.service';
import { DobleAutenticacionTipo } from '../../interfaces/common.interfaces';
import { environment } from '../../environments/environment';

@Component({
  selector: 'app-auth-approval-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './auth-approval-modal.html',
  styleUrls: ['./auth-approval-modal.css']
})
export class AuthApprovalModal implements OnInit, OnDestroy, OnChanges {
  @Input() isVisible = false;
  @Input() documentId: string | number | null | undefined = undefined;
  @Input() action: 'approve' | 'reject' = 'approve';
  @Output() close = new EventEmitter<void>();
  @Output() validate = new EventEmitter<{ token: string, action: 'approve' | 'reject' }>();
  @Output() cancel = new EventEmitter<void>();
  @Output() logoutRequired = new EventEmitter<void>();

  tokenCode = '';
  timeRemaining = 90;
  private timerInterval?: number;
  private readonly TIMER_DURATION = 90;
  private failedAttempts = 0;
  private readonly MAX_FAILED_ATTEMPTS = 3;

  authType: DobleAutenticacionTipo = DobleAutenticacionTipo.TOKEN_SEGURIDAD;
  instructions: string[] = [];
  buttonText = 'Validar Código';
  isLoading = false;
  errorMessage = '';
  infoMessage = '';

  constructor(
    private authTokenService: AuthTokenService,
    private http: HttpClient,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    if (this.isVisible) {
      this.loadAuthType();
      this.startTimer();
    }
  }

  ngOnDestroy(): void { this.clearTimer(); }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['isVisible'] && this.isVisible) {
      this.loadAuthType();
      this.resetModal();
      this.startTimer();
    } else if (changes['isVisible'] && !this.isVisible) {
      this.clearTimer();
    }
  }

  private loadAuthType(): void {
    this.authTokenService.getUserAuthType().subscribe({
      next: (authType: UserAuthType) => {
        this.authType = authType.authType || DobleAutenticacionTipo.TOKEN_SEGURIDAD;
        this.instructions = this.authTokenService.getInstructionsText(this.authType);
        this.buttonText = this.authTokenService.getButtonText(this.authType);
        this.timeRemaining = this.authTokenService.getTimerDuration(this.authType);

        if (this.authType === DobleAutenticacionTipo.TOKEN_SEGURIDAD) {
          this.sendEmailCode();
        }
      },
      error: (error) => {
        this.authType = DobleAutenticacionTipo.TOKEN_SEGURIDAD;
        this.instructions = this.authTokenService.getInstructionsText(this.authType);
        this.buttonText = this.authTokenService.getButtonText(this.authType);
        this.timeRemaining = this.authTokenService.getTimerDuration(this.authType);
        this.sendEmailCode();
      }
    });
  }

  private resetModal(): void {
    this.tokenCode = '';
    this.timeRemaining = this.authTokenService.getTimerDuration(this.authType);
    this.errorMessage = '';
    this.infoMessage = '';
    this.isLoading = false;
    this.failedAttempts = 0;
  }

  private startTimer(): void {
    this.clearTimer();
    this.timeRemaining = this.authTokenService.getTimerDuration(this.authType) || this.TIMER_DURATION;
    this.timerInterval = window.setInterval(() => {
      this.timeRemaining--;
      if (this.timeRemaining <= 0) {
        this.clearTimer();
        this.onTimerExpired();
      }
    }, 1000);
  }

  private clearTimer(): void {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = undefined;
    }
  }

  private onTimerExpired(): void { this.onClose(); }

  onTokenInput(event: Event): void {
    const target = event.target as HTMLInputElement;
    this.tokenCode = target.value;
    if (this.errorMessage) {
      this.errorMessage = '';
    }
  }

  private sendEmailCode(): void {
    this.authTokenService.sendEmailCode(this.documentId, this.action).subscribe({
      next: (res) => { 
        this.infoMessage = res.message || 'Se envió un código a su correo.'; 
      },
      error: (error) => { 
        this.errorMessage = 'No se pudo enviar el código. Intente nuevamente.'; 
        this.infoMessage = ''; 
      }
    });
  }

  onValidate(): void {
    if (!this.tokenCode || this.tokenCode.trim().length < 6) {
      this.errorMessage = 'Por favor ingrese un código de 6 dígitos';
      return;
    }
    if (this.isLoading) {
      return;
    }

    if (!this.documentId) {
      this.errorMessage = 'Error: No se encontró el ID de la solicitud';
      return;
    }

    const currentUser = this.authService.getCurrentUserValue();
    if (!currentUser || !currentUser.idUsuario) {
      this.errorMessage = 'Error: Usuario no autenticado';
      return;
    }


    this.isLoading = true;
    this.errorMessage = '';
    this.infoMessage = '';

    const endpoint = `${environment.apiUrl}/solicitudes/${this.documentId}/validar-2fa`;
    const payload = {
      usuarioId: currentUser.idUsuario,
      codigo2FA: this.tokenCode.trim()
    };

    const token = this.authService.getToken();
    const headers: { [key: string]: string } = {
      'Content-Type': 'application/json'
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    this.http.post<any>(endpoint, payload, { headers }).subscribe({
      next: (response) => {
        this.isLoading = false;
        
        if (response.valido === true) {
          this.failedAttempts = 0;
          this.validate.emit({ token: this.tokenCode.trim(), action: this.action });
        } else {
          this.failedAttempts++;
          
          if (this.failedAttempts >= this.MAX_FAILED_ATTEMPTS + 1) {
            this.errorMessage = 'Ha excedido el límite de intentos para ingresar el código, por seguridad esta sesión será finalizada y será redirigido a inicio de sesión.';
            this.infoMessage = '';
            alert('Límite de intentos excedido por seguridad. Esta sesión será finalizada.');
            setTimeout(() => {
              this.onClose();
              this.logoutRequired.emit();
            }, 5000);
          } else {
            const remainingAttempts = (this.MAX_FAILED_ATTEMPTS + 1) - this.failedAttempts;
            const errorMsg = response.message || 'Código inválido';
            this.errorMessage = `${errorMsg}. Valídelo e inténtelo de nuevo. Intentos restantes: ${remainingAttempts}`;
            this.infoMessage = '';
          }
        }
      },
      error: (error) => {
        this.isLoading = false;
                
        const errorResponse = error.error;
        const isInvalidCode = errorResponse?.code === 'CODIGO_2FA_INVALIDO' || 
                             error.status === 400 || 
                             error.status === 401;
                             if (isInvalidCode) {
          this.failedAttempts++;
          
          if (this.failedAttempts >= this.MAX_FAILED_ATTEMPTS + 1) {
            this.errorMessage = 'Ha excedido el límite de intentos para ingresar el código, por seguridad esta sesión será finalizada y será redirigido a inicio de sesión.';
            this.infoMessage = '';
            alert('Límite de intentos excedido por seguridad. Esta sesión será finalizada.');
            setTimeout(() => {
              this.onClose();
              this.logoutRequired.emit();
            }, 5000);
          } else {
            const remainingAttempts = (this.MAX_FAILED_ATTEMPTS + 1) - this.failedAttempts;
            const errorMsg = errorResponse?.message || 'Código inválido';
            this.errorMessage = `${errorMsg}. Valídelo e inténtelo de nuevo. Intentos restantes: ${remainingAttempts}`;
            this.infoMessage = '';
          }
        } else {
          this.errorMessage = 'Error de conexión. Intente nuevamente.';
        }
      }
    });
  }

  canValidate(): boolean {
    return this.tokenCode.trim().length >= 6 && this.timeRemaining > 0 && !this.isLoading;
  }

  onClose(): void { this.clearTimer(); this.close.emit(); }
  onCancel(): void { this.clearTimer(); this.cancel.emit(); }

  onBackdropClick(event: Event): void {
    if (event.target === event.currentTarget) {
      this.onClose();
    }
  }

  resetTimer(): void { this.startTimer(); }

  getFormattedTimeRemaining(): string {
    const minutes = Math.floor(this.timeRemaining / 60);
    const seconds = this.timeRemaining % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }
}
