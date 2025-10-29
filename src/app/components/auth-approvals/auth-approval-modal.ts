import { Component, Input, Output, EventEmitter, OnDestroy, OnInit, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthTokenService, TokenValidationRequest, TokenValidationResponse, UserAuthType } from '../../services/auth-token.service';
import { DobleAutenticacionTipo } from '../../interfaces/common.interfaces';

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
  private readonly TIMER_DURATION = 90; // segundos
  private failedAttempts = 0;
  private readonly MAX_FAILED_ATTEMPTS = 3;

  // Dynamic UI state (based on user auth type)
  authType: DobleAutenticacionTipo = DobleAutenticacionTipo.TOKEN_SEGURIDAD;
  instructions: string[] = [];
  buttonText = 'Validar Código';
  isLoading = false;
  errorMessage = '';
  infoMessage = '';

  constructor(private authTokenService: AuthTokenService) {}


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
      // No limpiar infoMessage aquí porque puede tener información de intentos restantes
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

    this.isLoading = true;
    this.errorMessage = '';
    this.infoMessage = '';

    const request: TokenValidationRequest = {
      token: this.tokenCode.trim(),
      action: this.action,
      documentId: this.documentId ?? undefined
    };

    this.authTokenService.validateToken(request).subscribe({
      next: (response: TokenValidationResponse) => {
        this.isLoading = false;
        
        if (response.success && response.valid) {
          // Código válido, resetear contador
          this.failedAttempts = 0;
          this.validate.emit({ token: this.tokenCode.trim(), action: this.action });
        } else {
          // Código inválido, incrementar contador de intentos fallidos
          this.failedAttempts++;
          
          // Si es el 4to intento fallido, mostrar alerta de sesión expirada y cerrar sesión
          if (this.failedAttempts >= this.MAX_FAILED_ATTEMPTS + 1) {
            // Mostrar mensaje de límite excedido solo en el último intento
            this.errorMessage = 'Ha excedido el límite de intentos para ingresar el código, por seguridad esta sesión será finalizada y será redirigido a inicio de sesión.';
            this.infoMessage = '';
            alert('Límite de intentos excedido por seguridad. Esta sesión será finalizada.');
            setTimeout(() => {
              this.onClose();
              this.logoutRequired.emit();
            }, 5000);
          } else {
            // Mostrar mensaje de error con información de intentos restantes en el mensaje rojo
            const remainingAttempts = (this.MAX_FAILED_ATTEMPTS + 1) - this.failedAttempts;
            this.errorMessage = `Código inválido. Valídelo e inténtelo de nuevo. Intentos restantes: ${remainingAttempts}`;
            this.infoMessage = ''; // Limpiar mensaje informativo cuando hay error
          }
        }
      },
      error: (error) => {
        this.isLoading = false;
        // Solo incrementar contador si es un error de validación (no de conexión)
        if (error.status === 400 || error.status === 401) {
          this.failedAttempts++;
          
          // Si es el 4to intento fallido, mostrar alerta de sesión expirada y cerrar sesión
          if (this.failedAttempts >= this.MAX_FAILED_ATTEMPTS + 1) {
            // Mostrar mensaje de límite excedido solo en el último intento
            this.errorMessage = 'Ha excedido el límite de intentos para ingresar el código, por seguridad esta sesión será finalizada y será redirigido a inicio de sesión.';
            this.infoMessage = '';
            alert('Límite de intentos excedido por seguridad. Esta sesión será finalizada.');
            setTimeout(() => {
              this.onClose();
              this.logoutRequired.emit();
            }, 5000);
          } else {
            // Mostrar mensaje de error con información de intentos restantes en el mensaje rojo
            const remainingAttempts = (this.MAX_FAILED_ATTEMPTS + 1) - this.failedAttempts;
            this.errorMessage = `Código inválido. Valídelo e inténtelo de nuevo. Intentos restantes: ${remainingAttempts}`;
            this.infoMessage = ''; // Limpiar mensaje informativo cuando hay error
          }
        } else {
          // Error de conexión, no incrementar contador
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
