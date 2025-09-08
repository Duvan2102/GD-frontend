import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { of, throwError } from 'rxjs';

import { GoogleAuthSetupComponent } from './google-auth-setup.component';
import { AuthService } from '../../services/auth.service';
import { GoogleAuthSetupResponse } from '../../interfaces/common.interfaces';

describe('GoogleAuthSetupComponent', () => {
  let component: GoogleAuthSetupComponent;
  let fixture: ComponentFixture<GoogleAuthSetupComponent>;
  let mockAuthService: jasmine.SpyObj<AuthService>;
  let mockRouter: jasmine.SpyObj<Router>;

  beforeEach(async () => {
    const authServiceSpy = jasmine.createSpyObj('AuthService', [
      'setupGoogleAuthenticator',
      'confirmGoogleAuthenticator'
    ]);
    const routerSpy = jasmine.createSpyObj('Router', ['navigate']);

    await TestBed.configureTestingModule({
      imports: [GoogleAuthSetupComponent, ReactiveFormsModule],
      providers: [
        { provide: AuthService, useValue: authServiceSpy },
        { provide: Router, useValue: routerSpy }
      ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(GoogleAuthSetupComponent);
    component = fixture.componentInstance;
    mockAuthService = TestBed.inject(AuthService) as jasmine.SpyObj<AuthService>;
    mockRouter = TestBed.inject(Router) as jasmine.SpyObj<Router>;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should load setup data on init', () => {
    const mockResponse: GoogleAuthSetupResponse = {
      qrCodeUrl: 'data:image/png;base64,test',
      secret: 'TEST123456',
      message: 'Setup successful'
    };
    mockAuthService.setupGoogleAuthenticator.and.returnValue(of(mockResponse));

    component.ngOnInit();

    expect(mockAuthService.setupGoogleAuthenticator).toHaveBeenCalled();
    expect(component.setupData).toEqual(mockResponse);
    expect(component.showQRCode).toBeTrue();
  });

  it('should handle setup error', () => {
    const error = { error: { code: '2FA_YA_CONFIGURADO', message: 'Already configured' } };
    mockAuthService.setupGoogleAuthenticator.and.returnValue(throwError(() => error));

    component.ngOnInit();

    expect(component.errorMessage).toBe('La doble autenticación ya está configurada');
  });

  it('should confirm Google Authenticator successfully', () => {
    mockAuthService.confirmGoogleAuthenticator.and.returnValue(of({ message: 'Success' }));
    component.setupForm.patchValue({ codigo: '123456' });

    component.onSubmit();

    expect(mockAuthService.confirmGoogleAuthenticator).toHaveBeenCalledWith('123456');
    expect(component.successMessage).toBe('Success');
  });

  it('should handle confirmation error', () => {
    const error = { error: { code: 'CODIGO_INVALIDO', message: 'Invalid code' } };
    mockAuthService.confirmGoogleAuthenticator.and.returnValue(throwError(() => error));
    component.setupForm.patchValue({ codigo: '123456' });

    component.onSubmit();

    expect(component.errorMessage).toBe('Código de Google Authenticator incorrecto');
  });

  it('should copy secret to clipboard', () => {
    component.setupData = {
      qrCodeUrl: 'test',
      secret: 'TEST123456',
      message: 'test'
    };

    spyOn(navigator.clipboard, 'writeText').and.returnValue(Promise.resolve());

    component.onCopySecret();

    expect(navigator.clipboard.writeText).toHaveBeenCalledWith('TEST123456');
  });

  it('should navigate to home on skip', () => {
    component.onSkip();

    expect(mockRouter.navigate).toHaveBeenCalledWith(['/']);
  });

  it('should validate form fields', () => {
    const codigoControl = component.setupForm.get('codigo');

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

  it('should toggle QR code visibility', () => {
    component.showQRCode = true;
    component.toggleQRCode();
    expect(component.showQRCode).toBeFalse();

    component.toggleQRCode();
    expect(component.showQRCode).toBeTrue();
  });
});

