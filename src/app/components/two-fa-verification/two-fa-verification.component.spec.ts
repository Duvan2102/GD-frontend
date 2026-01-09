import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { of, throwError } from 'rxjs';

import { TwoFAVerificationComponent } from './two-fa-verification.component';
import { AuthService } from '../../services/auth.service';

describe('TwoFAVerificationComponent', () => {
  let component: TwoFAVerificationComponent;
  let fixture: ComponentFixture<TwoFAVerificationComponent>;
  let mockAuthService: jasmine.SpyObj<AuthService>;
  let mockRouter: jasmine.SpyObj<Router>;

  beforeEach(async () => {
    const authServiceSpy = jasmine.createSpyObj('AuthService', [
      'isTwoFARequired',
      'getTwoFAUser',
      'validate2FACode',
      'sendEmailCode',
      'clear2FAState'
    ]);
    const routerSpy = jasmine.createSpyObj('Router', ['navigate']);

    await TestBed.configureTestingModule({
      imports: [TwoFAVerificationComponent, ReactiveFormsModule],
      providers: [
        { provide: AuthService, useValue: authServiceSpy },
        { provide: Router, useValue: routerSpy }
      ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(TwoFAVerificationComponent);
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

  it('should validate 2FA code successfully', () => {
    mockAuthService.validate2FACode.and.returnValue(of(true));
    component.verificationForm.patchValue({ codigo: '123456' });

    component.onSubmit();

    expect(mockAuthService.validate2FACode).toHaveBeenCalledWith('123456');
    expect(mockRouter.navigate).toHaveBeenCalledWith(['/']);
  });

  it('should handle 2FA validation error', () => {
    const error = { error: { code: 'CODIGO_2FA_INVALIDO', message: 'Código incorrecto' } };
    mockAuthService.validate2FACode.and.returnValue(throwError(() => error));
    component.verificationForm.patchValue({ codigo: '123456' });

    component.onSubmit();

    expect(component.errorMessage).toBe('Código de verificación incorrecto');
  });

  it('should send email code successfully', () => {
    mockAuthService.sendEmailCode.and.returnValue(of({ message: 'Código enviado' }));

    component.onSendEmailCode();

    expect(mockAuthService.sendEmailCode).toHaveBeenCalled();
  });

  it('should clear 2FA state and navigate to login', () => {
    component.onBackToLogin();

    expect(mockAuthService.clear2FAState).toHaveBeenCalled();
    expect(mockRouter.navigate).toHaveBeenCalledWith(['/login']);
  });

  it('should validate form fields', () => {
    const codigoControl = component.verificationForm.get('codigo');

    // Test required validation
    codigoControl?.setValue('');
    expect(codigoControl?.hasError('required')).toBeTruthy();

    // Test minlength validation
    codigoControl?.setValue('123');
    expect(codigoControl?.hasError('minlength')).toBeTruthy();

    // Test maxlength validation
    codigoControl?.setValue('1234567');
    expect(codigoControl?.hasError('maxlength')).toBeTruthy();

    // Test valid value
    codigoControl?.setValue('123456');
    expect(codigoControl?.valid).toBeTruthy();
  });
});

