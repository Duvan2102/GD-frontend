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
  // Document context for validation
  @Input() documentId: string | number | null | undefined = undefined;
  @Input() action: 'approve' | 'reject' = 'approve';
  @Output() close = new EventEmitter<void>();
  @Output() validate = new EventEmitter<{ token: string, action: 'approve' | 'reject' }>();
  @Output() cancel = new EventEmitter<void>();
  @Output() logoutRequired = new EventEmitter<void>();

  tokenCode = '';
  timeRemaining = 90;
  private timerInterval?: number;
  private readonly TIMER_DURATION = 90; // seconds

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
    console.log('🔐 ===== CARGANDO TIPO DE AUTENTICACIÓN =====');
    console.log('🔐 DocumentId:', this.documentId);
    console.log('🔐 Action:', this.action);
    
    this.authTokenService.getUserAuthType().subscribe({
      next: (authType: UserAuthType) => {
        console.log('✅ ===== TIPO DE AUTENTICACIÓN OBTENIDO =====');
        console.log('✅ hasGoogleAuth:', authType.hasGoogleAuth);
        console.log('✅ hasEmailBackup:', authType.hasEmailBackup);
        console.log('✅ authType:', authType.authType);
        
        this.authType = authType.authType || DobleAutenticacionTipo.TOKEN_SEGURIDAD;
        this.instructions = this.authTokenService.getInstructionsText(this.authType);
        this.buttonText = this.authTokenService.getButtonText(this.authType);
        this.timeRemaining = this.authTokenService.getTimerDuration(this.authType);
        
        console.log('✅ ===== CONFIGURACIÓN FINAL =====');
        console.log('✅ Tipo seleccionado:', this.authType);
        console.log('✅ Instrucciones:', this.instructions);
        console.log('✅ Texto del botón:', this.buttonText);
        console.log('✅ Tiempo restante:', this.timeRemaining);
        
        if (this.authType === DobleAutenticacionTipo.TOKEN_SEGURIDAD) {
          console.log('📧 ===== ENVIANDO CORREO AUTOMÁTICAMENTE =====');
          this.sendEmailCode();
        } else {
          console.log('🔐 ===== USANDO GOOGLE AUTHENTICATOR =====');
        }
      },
      error: (error) => {
        console.error('❌ ===== ERROR CARGANDO TIPO DE AUTENTICACIÓN =====');
        console.error('❌ Error:', error);
        console.log('❌ Usando fallback: TOKEN_SEGURIDAD');
        
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
  }

  private startTimer(): void {
    this.clearTimer();
    // Use dynamic duration based on auth type when available
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
    if (this.errorMessage) this.errorMessage = '';
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
          this.validate.emit({ token: this.tokenCode.trim(), action: this.action });
        } else if (response.requiresLogout) {
          this.errorMessage = response.message || 'Sesión expirada. Debe cerrar sesión e iniciar sesión nuevamente.';
          this.infoMessage = 'Por favor, cierre sesión e inicie sesión nuevamente para continuar.';
          
          setTimeout(() => {
            this.onClose();
            this.logoutRequired.emit();
          }, 3000);
        } else {
          this.errorMessage = response.message || 'Código inválido. Intente nuevamente.';
        }
      },
      error: (error) => {
        this.isLoading = false;
        this.errorMessage = 'Error de conexión. Intente nuevamente.';
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
