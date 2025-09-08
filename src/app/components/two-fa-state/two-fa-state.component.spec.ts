import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { of, throwError } from 'rxjs';

import { TwoFAStateComponent } from './two-fa-state.component';
import { AuthService } from '../../services/auth.service';
import { TwoFAStatusResponse } from '../../interfaces/common.interfaces';

describe('TwoFAStateComponent', () => {
  let component: TwoFAStateComponent;
  let fixture: ComponentFixture<TwoFAStateComponent>;
  let mockAuthService: jasmine.SpyObj<AuthService>;
  let mockRouter: jasmine.SpyObj<Router>;

  beforeEach(async () => {
    const authServiceSpy = jasmine.createSpyObj('AuthService', [
      'isTwoFARequired',
      'getTwoFAUser',
      'check2FAStatus',
      'getQRCode',
      'clear2FAState'
    ]);
    const routerSpy = jasmine.createSpyObj('Router', ['navigate']);

    await TestBed.configureTestingModule({
      imports: [TwoFAStateComponent],
      providers: [
        { provide: AuthService, useValue: authServiceSpy },
        { provide: Router, useValue: routerSpy }
      ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(TwoFAStateComponent);
    component = fixture.componentInstance;
    mockAuthService = TestBed.inject(AuthService) as jasmine.SpyObj<AuthService>;
    mockRouter = TestBed.inject(Router) as jasmine.SpyObj<Router>;

    // Configurar valores por defecto para los mocks
    mockAuthService.isTwoFARequired.and.returnValue(true);
    mockAuthService.getTwoFAUser.and.returnValue(of('test.user'));
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should redirect to login if 2FA is not required', () => {
    mockAuthService.isTwoFARequired.and.returnValue(false);

    component.ngOnInit();

    expect(mockRouter.navigate).toHaveBeenCalledWith(['/login']);
  });

  it('should load current user on init', () => {
    component.ngOnInit();

    expect(component.currentUser).toBe('test.user');
  });

  it('should check 2FA status on init', () => {
    const mockResponse: TwoFAStatusResponse = {
      hasGoogleAuth: true,
      hasEmailBackup: true,
      message: 'Estado verificado'
    };
    mockAuthService.check2FAStatus.and.returnValue(of(mockResponse));

    component.ngOnInit();

    expect(mockAuthService.check2FAStatus).toHaveBeenCalled();
  });

  it('should navigate to verification when Google Auth is configured', () => {
    const mockResponse: TwoFAStatusResponse = {
      hasGoogleAuth: true,
      hasEmailBackup: true,
      message: 'Estado verificado'
    };
    mockAuthService.check2FAStatus.and.returnValue(of(mockResponse));

    component.ngOnInit();

    expect(mockRouter.navigate).toHaveBeenCalledWith(['/two-fa-verification']);
  });

  it('should load QR code when setup is needed', () => {
    const mockResponse: TwoFAStatusResponse = {
      hasGoogleAuth: false,
      hasEmailBackup: false,
      message: 'Configuración requerida'
    };
    const mockQRResponse = {
      qrCodeUrl: 'data:image/png;base64,test',
      secret: 'TEST123',
      isNew: true,
      message: 'Nuevo código QR'
    };

    mockAuthService.check2FAStatus.and.returnValue(of(mockResponse));
    mockAuthService.getQRCode.and.returnValue(of(mockQRResponse));

    component.ngOnInit();

    expect(mockAuthService.getQRCode).toHaveBeenCalled();
    expect(component.qrData).toEqual(mockQRResponse);
  });

  it('should handle 2FA status error', () => {
    const error = { error: { code: 'TOKEN_INVALIDO', message: 'Token expirado' } };
    mockAuthService.check2FAStatus.and.returnValue(throwError(() => error));

    component.ngOnInit();

    expect(component.errorMessage).toBe('Sesión expirada. Por favor, inicia sesión nuevamente');
  });

  it('should navigate to Google Auth setup', () => {
    component.onSetupGoogleAuth();

    expect(mockRouter.navigate).toHaveBeenCalledWith(['/google-auth-setup']);
  });

  it('should navigate to verification for email backup', () => {
    component.onUseEmailBackup();

    expect(mockRouter.navigate).toHaveBeenCalledWith(['/two-fa-verification']);
  });

  it('should clear state and navigate to login', () => {
    component.onBackToLogin();

    expect(mockAuthService.clear2FAState).toHaveBeenCalled();
    expect(mockRouter.navigate).toHaveBeenCalledWith(['/login']);
  });

  it('should retry on error', () => {
    const mockResponse: TwoFAStatusResponse = {
      hasGoogleAuth: true,
      hasEmailBackup: true,
      message: 'Estado verificado'
    };
    mockAuthService.check2FAStatus.and.returnValue(of(mockResponse));

    component.check2FAStatus();

    expect(mockAuthService.check2FAStatus).toHaveBeenCalled();
  });

  it('should determine correct getters', () => {
    component.twoFAState = {
      hasGoogleAuth: true,
      hasEmailBackup: false,
      isConfigured: true,
      needsSetup: false
    };

    expect(component.hasGoogleAuth).toBeTrue();
    expect(component.hasEmailBackup).toBeFalse();
    expect(component.needsSetup).toBeFalse();
    expect(component.isConfigured).toBeTrue();
  });
});
