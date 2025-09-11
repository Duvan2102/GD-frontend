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
    console.log('🔐 Document ID:', this.documentId);
    console.log('🔐 Acción:', this.action);
    
    this.authTokenService.getUserAuthType().subscribe({
      next: (authType: UserAuthType) => {
        console.log('🔐 ===== TIPO DE AUTENTICACIÓN DETECTADO =====');
        console.log('🔐 AuthType recibido:', JSON.stringify(authType, null, 2));
        console.log('🔐 hasGoogleAuth:', authType.hasGoogleAuth);
        console.log('🔐 hasEmailBackup:', authType.hasEmailBackup);
        console.log('🔐 authType:', authType.authType);
        
        this.authType = authType.authType || DobleAutenticacionTipo.TOKEN_SEGURIDAD;
        this.instructions = this.authTokenService.getInstructionsText(this.authType);
        this.buttonText = this.authTokenService.getButtonText(this.authType);
        this.timeRemaining = this.authTokenService.getTimerDuration(this.authType);
        
        console.log('🔐 Configuración final del modal:');
        console.log('🔐 - Tipo de autenticación:', this.authType);
        console.log('🔐 - Instrucciones:', this.instructions);
        console.log('🔐 - Texto del botón:', this.buttonText);
        console.log('🔐 - Tiempo restante:', this.timeRemaining);
        
        // If using email token, trigger sending a fresh code
        if (this.authType === DobleAutenticacionTipo.TOKEN_SEGURIDAD) {
          console.log('🔐 Enviando código por email...');
          this.sendEmailCode();
        } else {
          console.log('🔐 Usando Google Authenticator - no se envía email');
        }
      },
      error: (error) => {
        console.error('🔐 ===== ERROR CARGANDO TIPO DE AUTENTICACIÓN =====');
        console.error('🔐 Error completo:', error);
        console.error('🔐 Status del error:', error.status);
        console.error('🔐 Mensaje del error:', error.message);
        console.error('🔐 Stack trace:', error.stack);
        
        // Fallback to email token
        console.log('🔐 Usando fallback a email token');
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
    console.log('🔐 ===== ENVIANDO CÓDIGO POR EMAIL =====');
    console.log('🔐 Document ID:', this.documentId);
    console.log('🔐 Acción:', this.action);
    
    this.authTokenService.sendEmailCode(this.documentId, this.action).subscribe({
      next: (res) => { 
        console.log('🔐 ===== CÓDIGO EMAIL ENVIADO =====');
        console.log('🔐 Respuesta:', JSON.stringify(res, null, 2));
        console.log('🔐 Success:', res.success);
        console.log('🔐 Message:', res.message);
        
        this.infoMessage = res.message || 'Se envió un código a su correo.'; 
      },
      error: (error) => { 
        console.error('🔐 ===== ERROR ENVIANDO CÓDIGO EMAIL =====');
        console.error('🔐 Error completo:', error);
        console.error('🔐 Status del error:', error.status);
        console.error('🔐 Mensaje del error:', error.message);
        console.error('🔐 URL del error:', error.url);
        console.error('🔐 Stack trace:', error.stack);
        
        this.errorMessage = 'No se pudo enviar el código. Intente nuevamente.'; 
        this.infoMessage = ''; 
      }
    });
  }

  onValidate(): void {
    console.log('🔐 ===== INICIO VALIDACIÓN EN MODAL =====');
    console.log('🔐 Código ingresado:', this.tokenCode);
    console.log('🔐 Longitud del código:', this.tokenCode?.length || 0);
    console.log('🔐 Acción:', this.action);
    console.log('🔐 Document ID:', this.documentId);
    console.log('🔐 Tipo de autenticación:', this.authType);
    console.log('🔐 Tiempo restante:', this.timeRemaining);
    console.log('🔐 Estado de carga:', this.isLoading);
    
    if (!this.tokenCode || this.tokenCode.trim().length < 6) {
      console.log('🔐 ERROR: Código muy corto');
      this.errorMessage = 'Por favor ingrese un código de 6 dígitos';
      return;
    }
    if (this.isLoading) {
      console.log('🔐 ERROR: Ya hay una validación en progreso');
      return;
    }

    console.log('🔐 Iniciando validación...');
    this.isLoading = true;
    this.errorMessage = '';
    this.infoMessage = '';

    // Validación directa: el servicio tomará el tempToken persistido o el explícito si se provee
    const request: TokenValidationRequest = {
      token: this.tokenCode.trim(),
      action: this.action,
      documentId: this.documentId ?? undefined
    };

    console.log('🔐 Request de validación enviado al servicio:', JSON.stringify(request, null, 2));

    this.authTokenService.validateToken(request).subscribe({
      next: (response: TokenValidationResponse) => {
        console.log('🔐 ===== RESPUESTA EN MODAL =====');
        console.log('🔐 Respuesta completa:', JSON.stringify(response, null, 2));
        console.log('🔐 Success:', response.success);
        console.log('🔐 Valid:', response.valid);
        console.log('🔐 Message:', response.message);
        
        this.isLoading = false;
        
        if (response.success && response.valid) {
          console.log('🔐 ✅ VALIDACIÓN EXITOSA - Emitiendo evento');
          this.validate.emit({ token: this.tokenCode.trim(), action: this.action });
        } else {
          console.log('🔐 ❌ VALIDACIÓN FALLIDA:', response.message);
          this.errorMessage = response.message || 'Código inválido. Intente nuevamente.';
        }
      },
      error: (error) => {
        console.error('🔐 ===== ERROR EN VALIDACIÓN =====');
        console.error('🔐 Error completo:', error);
        console.error('🔐 Status del error:', error.status);
        console.error('🔐 Mensaje del error:', error.message);
        console.error('🔐 URL del error:', error.url);
        console.error('🔐 Stack trace:', error.stack);
        
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
    // Solo cerrar si el click fue en el backdrop (no en el contenido del modal)
    if (event.target === event.currentTarget) {
      console.log('🔐 Click en backdrop - cerrando modal');
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
