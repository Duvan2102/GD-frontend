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
      'disable2FA',
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

    // Configurar valores por defecto para los mocks
    mockAuthService.getCurrentUser.and.returnValue(of({
      idUsuario: 1,
      usuario: 'test.user',
      dobleAutenticacion: false
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

  it('should disable 2FA successfully', () => {
    mockAuthService.disable2FA.and.returnValue(of({ message: '2FA disabled' }));
    component.disableForm.patchValue({ password: 'test123' });

    component.onDisable2FA();

    expect(mockAuthService.disable2FA).toHaveBeenCalledWith('test123');
    expect(component.successMessage).toBe('2FA disabled');
  });

  it('should handle disable 2FA error', () => {
    const error = { error: { code: 'PASSWORD_INCORRECT', message: 'Wrong password' } };
    mockAuthService.disable2FA.and.returnValue(throwError(() => error));
    component.disableForm.patchValue({ password: 'wrong' });

    component.onDisable2FA();

    expect(component.errorMessage).toBe('Contraseña incorrecta');
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

  it('should validate form fields', () => {
    const passwordControl = component.disableForm.get('password');

    // Test required validation
    passwordControl?.setValue('');
    expect(passwordControl?.hasError('required')).toBeTruthy();

    // Test minlength validation
    passwordControl?.setValue('123');
    expect(passwordControl?.hasError('minlength')).toBeTruthy();

    // Test valid value
    passwordControl?.setValue('1234');
    expect(passwordControl?.valid).toBeTruthy();
  });

  it('should check 2FA status correctly', () => {
    component.currentUser = { dobleAutenticacion: true };
    expect(component.is2FAEnabled()).toBeTrue();
    expect(component.get2FAStatusText()).toBe('Habilitado');
    expect(component.get2FAStatusClass()).toBe('status-enabled');

    component.currentUser = { dobleAutenticacion: false };
    expect(component.is2FAEnabled()).toBeFalse();
    expect(component.get2FAStatusText()).toBe('Deshabilitado');
    expect(component.get2FAStatusClass()).toBe('status-disabled');
  });
});

