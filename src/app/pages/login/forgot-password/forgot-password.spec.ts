import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { FormBuilder } from '@angular/forms';
import { of, throwError } from 'rxjs';

import { ForgotPassword } from './forgot-password';
import { PasswordResetService } from '../../../services/password-reset.service';

describe('ForgotPassword', () => {
  let component: ForgotPassword;
  let fixture: ComponentFixture<ForgotPassword>;
  let passwordResetService: jasmine.SpyObj<PasswordResetService>;

  beforeEach(async () => {
    const spy = jasmine.createSpyObj('PasswordResetService', ['requestPasswordReset']);

    await TestBed.configureTestingModule({
      imports: [ForgotPassword, HttpClientTestingModule, RouterTestingModule],
      providers: [
        FormBuilder,
        { provide: PasswordResetService, useValue: spy }
      ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ForgotPassword);
    component = fixture.componentInstance;
    passwordResetService = TestBed.inject(PasswordResetService) as jasmine.SpyObj<PasswordResetService>;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should validate email field', () => {
    const emailControl = component.userForm.get('email');
    
    // Test required validation
    emailControl?.setValue('');
    expect(emailControl?.hasError('required')).toBeTrue();
    
    // Test email validation
    emailControl?.setValue('invalid-email');
    expect(emailControl?.hasError('email')).toBeTrue();
    
    // Test valid input
    emailControl?.setValue('usuario@empresa.com');
    expect(emailControl?.valid).toBeTrue();
  });

  it('should call requestPasswordReset when form is valid', async () => {
    const mockResponse = { message: 'Si el correo electrónico existe en nuestro sistema, recibirá instrucciones para restablecer su contraseña.' };
    passwordResetService.requestPasswordReset.and.returnValue(of(mockResponse));
    
    component.userForm.patchValue({ email: 'usuario@empresa.com' });
    
    await component.onRequestPasswordReset();
    
    expect(passwordResetService.requestPasswordReset).toHaveBeenCalledWith('usuario@empresa.com');
    expect(component.successMessage).toBe('Si el correo electrónico existe en nuestro sistema, recibirá instrucciones para restablecer su contraseña.');
    expect(component.showSuccessMessage).toBeTrue();
  });

  it('should handle requestPasswordReset error', async () => {
    passwordResetService.requestPasswordReset.and.returnValue(throwError(() => ({ error: { message: 'Error de conexión' } })));
    
    component.userForm.patchValue({ email: 'usuario@empresa.com' });
    
    await component.onRequestPasswordReset();
    
    expect(component.errorMessage).toBe('Error de conexión');
  });
});
