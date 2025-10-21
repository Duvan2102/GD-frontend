import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { of, throwError } from 'rxjs';

import { TwoFAManagementComponent } from './two-fa-management.component';
import { AuthService } from '../../services/auth.service';

describe('TwoFAManagementComponent', () => {
  let component: TwoFAManagementComponent;
  let fixture: ComponentFixture<TwoFAManagementComponent>;
  let mockAuthService: jasmine.SpyObj<AuthService>;
  let mockRouter: jasmine.SpyObj<Router>;

  beforeEach(async () => {
    const authServiceSpy = jasmine.createSpyObj('AuthService', [
      'getCurrentUser',
      'getLoginStats',
      'change2FAMethod',
      'unlockUser'
    ]);
    const routerSpy = jasmine.createSpyObj('Router', ['navigate']);

    await TestBed.configureTestingModule({
      imports: [TwoFAManagementComponent, ReactiveFormsModule],
      providers: [
        { provide: AuthService, useValue: authServiceSpy },
        { provide: Router, useValue: routerSpy }
      ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(TwoFAManagementComponent);
    component = fixture.componentInstance;
    mockAuthService = TestBed.inject(AuthService) as jasmine.SpyObj<AuthService>;
    mockRouter = TestBed.inject(Router) as jasmine.SpyObj<Router>;

    mockAuthService.getCurrentUser.and.returnValue(of({
      idUsuario: 1,
      usuario: 'test.user',
      dobleAutenticacion: 'GOOGLE_AUTH',
      tokenQr: true,
      tokenCorreo: false
    }));
    mockAuthService.getLoginStats.and.returnValue(of({ message: 'Intentos: 0/5' }));
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should load current user and stats on init', () => {
    component.ngOnInit();

    expect(mockAuthService.getCurrentUser).toHaveBeenCalled();
    expect(mockAuthService.getLoginStats).toHaveBeenCalled();
  });

  it('should navigate to Google Auth setup', () => {
    component.onSetupGoogleAuth();

    expect(mockRouter.navigate).toHaveBeenCalledWith(['/google-auth-setup']);
  });

  it('should change 2FA method to EMAIL successfully', () => {
    mockAuthService.change2FAMethod.and.returnValue(of({ message: 'Método cambiado a EMAIL' }));
    component.currentUser = { idUsuario: 1, tokenQr: true, tokenCorreo: false };

    component.onChangeToEmail();

    expect(mockAuthService.change2FAMethod).toHaveBeenCalledWith(1, 'EMAIL');
    expect(component.successMessage).toContain('EMAIL');
  });

  it('should change 2FA method to GOOGLE_AUTH successfully', () => {
    mockAuthService.change2FAMethod.and.returnValue(of({ message: 'Método cambiado a GOOGLE_AUTH' }));
    component.currentUser = { idUsuario: 1, tokenQr: false, tokenCorreo: true };

    component.onChangeToGoogleAuth();

    expect(mockAuthService.change2FAMethod).toHaveBeenCalledWith(1, 'GOOGLE_AUTH');
    expect(component.successMessage).toContain('GOOGLE_AUTH');
  });

  it('should unlock user successfully', () => {
    mockAuthService.unlockUser.and.returnValue(of({ message: 'User unlocked' }));

    component.onUnlockUser();

    expect(mockAuthService.unlockUser).toHaveBeenCalled();
    expect(component.successMessage).toBe('User unlocked');
  });

  it('should handle unlock user error', () => {
    const error = { error: { message: 'Unlock failed' } };
    mockAuthService.unlockUser.and.returnValue(throwError(() => error));

    component.onUnlockUser();

    expect(component.errorMessage).toBe('Error de conexión. Verifica tu conexión a internet');
  });

  it('should refresh login stats', () => {
    component.onRefreshStats();

    expect(mockAuthService.getLoginStats).toHaveBeenCalledTimes(2); // Once in init, once in refresh
  });

  it('should detect Google Authenticator as current method', () => {
    component.currentUser = { dobleAutenticacion: 'GOOGLE_AUTH', tokenQr: true, tokenCorreo: false };
    expect(component.isGoogleAuth).toBeTrue();
    expect(component.isEmail).toBeFalse();
    expect(component.currentMethodText).toBe('Google Authenticator');
  });

  it('should detect Email as current method', () => {
    component.currentUser = { dobleAutenticacion: 'EMAIL', tokenQr: false, tokenCorreo: true };
    expect(component.isEmail).toBeTrue();
    expect(component.isGoogleAuth).toBeFalse();
    expect(component.currentMethodText).toBe('Código por Email');
  });
});

