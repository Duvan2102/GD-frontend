import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { of, throwError } from 'rxjs';

import { UserFormRegister } from './user-form-register';
import { AuthService } from '../../services/auth.service';
import { RegisterResponse, RegisterErrorResponse } from '../../interfaces/common.interfaces';

describe('UserFormRegister', () => {
  let component: UserFormRegister;
  let fixture: ComponentFixture<UserFormRegister>;
  let authService: jasmine.SpyObj<AuthService>;
  let httpMock: HttpTestingController;

  beforeEach(async () => {
    const authServiceSpy = jasmine.createSpyObj('AuthService', ['register']);

    await TestBed.configureTestingModule({
      imports: [
        UserFormRegister,
        ReactiveFormsModule,
        HttpClientTestingModule
      ],
      providers: [
        { provide: AuthService, useValue: authServiceSpy }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(UserFormRegister);
    component = fixture.componentInstance;
    authService = TestBed.inject(AuthService) as jasmine.SpyObj<AuthService>;
    httpMock = TestBed.inject(HttpTestingController);
    
    fixture.detectChanges();
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize with empty form', () => {
    expect(component.form.get('identificacion')?.value).toBe('');
    expect(component.form.get('nombres')?.value).toBe('');
    expect(component.form.get('apellidos')?.value).toBe('');
    expect(component.form.get('usuario')?.value).toBe('');
    expect(component.form.get('password')?.value).toBe('');
    expect(component.form.get('correoEmpresarial')?.value).toBe('');
    expect(component.form.get('correoPersonal')?.value).toBe('');
    expect(component.form.get('telefono1')?.value).toBe('');
    expect(component.form.get('telefono2')?.value).toBe('');
    expect(component.form.get('direccion')?.value).toBe('');
  });

  it('should be invalid when required fields are empty', () => {
    component.form.setValue({
      identificacion: '',
      nombres: '',
      apellidos: '',
      usuario: '',
      password: '',
      correoEmpresarial: '',
      correoPersonal: '',
      telefono1: '',
      telefono2: '',
      direccion: ''
    });

    expect(component.form.invalid).toBeTrue();
    expect(component.form.get('identificacion')?.hasError('required')).toBeTrue();
    expect(component.form.get('nombres')?.hasError('required')).toBeTrue();
    expect(component.form.get('apellidos')?.hasError('required')).toBeTrue();
    expect(component.form.get('usuario')?.hasError('required')).toBeTrue();
    expect(component.form.get('password')?.hasError('required')).toBeTrue();
  });

  it('should validate usuario field with proper constraints', () => {
    const usuarioControl = component.form.get('usuario');

    usuarioControl?.setValue('ab');
    expect(usuarioControl?.hasError('minlength')).toBeTrue();

    usuarioControl?.setValue('a'.repeat(51));
    expect(usuarioControl?.hasError('maxlength')).toBeTrue();

    usuarioControl?.setValue('user@invalid');
    expect(usuarioControl?.hasError('pattern')).toBeTrue();

    usuarioControl?.setValue('valid_user123');
    expect(usuarioControl?.hasError('pattern')).toBeFalse();
    expect(usuarioControl?.hasError('minlength')).toBeFalse();
    expect(usuarioControl?.hasError('maxlength')).toBeFalse();
  });

  it('should validate password field with minimum length', () => {
    const passwordControl = component.form.get('password');

    passwordControl?.setValue('1234567');
    expect(passwordControl?.hasError('minlength')).toBeTrue();

    passwordControl?.setValue('12345678');
    expect(passwordControl?.hasError('minlength')).toBeFalse();
  });

  it('should validate email fields', () => {
    const correoEmpresarialControl = component.form.get('correoEmpresarial');
    const correoPersonalControl = component.form.get('correoPersonal');

    correoEmpresarialControl?.setValue('invalid-email');
    expect(correoEmpresarialControl?.hasError('email')).toBeTrue();

    correoPersonalControl?.setValue('invalid-email');
    expect(correoPersonalControl?.hasError('email')).toBeTrue();

    correoEmpresarialControl?.setValue('test@company.com');
    expect(correoEmpresarialControl?.hasError('email')).toBeFalse();

    correoPersonalControl?.setValue('test@gmail.com');
    expect(correoPersonalControl?.hasError('email')).toBeFalse();

    correoEmpresarialControl?.setValue('');
    expect(correoEmpresarialControl?.hasError('email')).toBeFalse();
  });

  it('should validate phone fields', () => {
    const telefono1Control = component.form.get('telefono1');
    const telefono2Control = component.form.get('telefono2');

    telefono1Control?.setValue('abc123');
    expect(telefono1Control?.hasError('pattern')).toBeTrue();

    telefono2Control?.setValue('abc123');
    expect(telefono2Control?.hasError('pattern')).toBeTrue();

    telefono1Control?.setValue('+57 300 123 4567');
    expect(telefono1Control?.hasError('pattern')).toBeFalse();

    telefono2Control?.setValue('6012345678');
    expect(telefono2Control?.hasError('pattern')).toBeFalse();

    telefono1Control?.setValue('');
    expect(telefono1Control?.hasError('pattern')).toBeFalse();
  });

  it('should get correct error messages', () => {
    const identificacionControl = component.form.get('identificacion');
    const usuarioControl = component.form.get('usuario');
    const passwordControl = component.form.get('password');
    const correoControl = component.form.get('correoEmpresarial');

    identificacionControl?.markAsTouched();
    identificacionControl?.setValue('');
    expect(component.getErrorMessage('identificacion')).toBe('Este campo es obligatorio');

    usuarioControl?.markAsTouched();
    usuarioControl?.setValue('ab');
    expect(component.getErrorMessage('usuario')).toBe('El usuario debe tener al menos 3 caracteres');

    passwordControl?.markAsTouched();
    passwordControl?.setValue('1234567');
    expect(component.getErrorMessage('password')).toBe('La contraseña debe tener al menos 8 caracteres');

    usuarioControl?.setValue('user@invalid');
    expect(component.getErrorMessage('usuario')).toBe('Solo se permiten letras, números, puntos, guiones bajos y guiones');

    correoControl?.markAsTouched();
    correoControl?.setValue('invalid-email');
    expect(component.getErrorMessage('correoEmpresarial')).toBe('Ingrese un correo electrónico válido');

    usuarioControl?.setErrors({ server: 'Usuario ya existe' });
    expect(component.getErrorMessage('usuario')).toBe('Usuario ya existe');
  });

  it('should emit registered event on successful registration', fakeAsync(() => {
    spyOn(component.registered, 'emit');
    
    const mockResponse: RegisterResponse = {
      message: 'Usuario registrado exitosamente. Debe ser activado por un administrador.',
      idUsuario: 123
    };

    authService.register.and.returnValue(of(mockResponse));

    component.form.setValue({
      identificacion: '12345678',
      nombres: 'Juan',
      apellidos: 'Pérez',
      usuario: 'jperez',
      password: '12345678',
      correoEmpresarial: 'jperez@company.com',
      correoPersonal: 'jperez@gmail.com',
      telefono1: '3001234567',
      telefono2: '',
      direccion: 'Calle 123'
    });

    component.onSubmit();
    tick();

    expect(authService.register).toHaveBeenCalledWith({
      identificacion: '12345678',
      nombres: 'Juan',
      apellidos: 'Pérez',
      usuario: 'jperez',
      password: '12345678',
      correoEmpresarial: 'jperez@company.com',
      correoPersonal: 'jperez@gmail.com',
      telefono1: '3001234567',
      telefono2: '',
      direccion: 'Calle 123'
    });

    expect(component.registered.emit).toHaveBeenCalledWith({ idUsuario: 123 });
    expect(component.successMessage).toBe(mockResponse.message);
    expect(component.loading).toBeFalse();
  }));

  it('should handle USUARIO_EXISTE error', fakeAsync(() => {
    const mockError = {
      error: {
        code: 'USUARIO_EXISTE',
        message: 'El usuario ya existe'
      } as RegisterErrorResponse
    };

    authService.register.and.returnValue(throwError(() => mockError));

    component.form.setValue({
      identificacion: '12345678',
      nombres: 'Juan',
      apellidos: 'Pérez',
      usuario: 'existinguser',
      password: '12345678',
      correoEmpresarial: 'jperez@company.com',
      correoPersonal: '',
      telefono1: '',
      telefono2: '',
      direccion: ''
    });

    component.onSubmit();
    tick();

    expect(component.apiError).toBe('El usuario ya existe');
    expect(component.form.get('usuario')?.errors?.['server']).toBe('El usuario ya existe');
    expect(component.loading).toBeFalse();
  }));

  it('should handle IDENTIFICACION_EXISTE error', fakeAsync(() => {
    const mockError = {
      error: {
        code: 'IDENTIFICACION_EXISTE',
        message: 'La identificación ya existe'
      } as RegisterErrorResponse
    };

    authService.register.and.returnValue(throwError(() => mockError));

    component.form.setValue({
      identificacion: 'existing123',
      nombres: 'Juan',
      apellidos: 'Pérez',
      usuario: 'jperez',
      password: '12345678',
      correoEmpresarial: 'jperez@company.com',
      correoPersonal: '',
      telefono1: '',
      telefono2: '',
      direccion: ''
    });

    component.onSubmit();
    tick();

    expect(component.apiError).toBe('La identificación ya existe');
    expect(component.form.get('identificacion')?.errors?.['server']).toBe('La identificación ya existe');
    expect(component.loading).toBeFalse();
  }));

  it('should handle CORREO_EXISTE error', fakeAsync(() => {
    const mockError = {
      error: {
        code: 'CORREO_EXISTE',
        message: 'El correo empresarial ya existe'
      } as RegisterErrorResponse
    };

    authService.register.and.returnValue(throwError(() => mockError));

    component.form.setValue({
      identificacion: '12345678',
      nombres: 'Juan',
      apellidos: 'Pérez',
      usuario: 'jperez',
      password: '12345678',
      correoEmpresarial: 'existing@company.com',
      correoPersonal: '',
      telefono1: '',
      telefono2: '',
      direccion: ''
    });

    component.onSubmit();
    tick();

    expect(component.apiError).toBe('El correo empresarial ya existe');
    expect(component.form.get('correoEmpresarial')?.errors?.['server']).toBe('El correo empresarial ya existe');
    expect(component.loading).toBeFalse();
  }));

  it('should handle generic error', fakeAsync(() => {
    const mockError = {
      error: {
        message: 'Error de conexión'
      }
    };

    authService.register.and.returnValue(throwError(() => mockError));

    component.form.setValue({
      identificacion: '12345678',
      nombres: 'Juan',
      apellidos: 'Pérez',
      usuario: 'jperez',
      password: '12345678',
      correoEmpresarial: 'jperez@company.com',
      correoPersonal: '',
      telefono1: '',
      telefono2: '',
      direccion: ''
    });

    component.onSubmit();
    tick();

    expect(component.apiError).toBe('Error de conexión');
    expect(component.loading).toBeFalse();
  }));

  it('should handle error without error response', fakeAsync(() => {
    const mockError = {};

    authService.register.and.returnValue(throwError(() => mockError));

    component.form.setValue({
      identificacion: '12345678',
      nombres: 'Juan',
      apellidos: 'Pérez',
      usuario: 'jperez',
      password: '12345678',
      correoEmpresarial: 'jperez@company.com',
      correoPersonal: '',
      telefono1: '',
      telefono2: '',
      direccion: ''
    });

    component.onSubmit();
    tick();

    expect(component.apiError).toBe('Error de conexión. Intenta de nuevo.');
    expect(component.loading).toBeFalse();
  }));

  it('should not submit when form is invalid', () => {
    spyOn(component.form, 'markAllAsTouched');
    spyOn(component, 'focusFirstError');

    component.onSubmit();

    expect(component.form.markAllAsTouched).toHaveBeenCalled();
    expect(component.focusFirstError).toHaveBeenCalled();
    expect(authService.register).not.toHaveBeenCalled();
  });

  it('should close modal and reset form', () => {
    spyOn(component.close, 'emit');

    component.closeModal();

    expect(component.form.pristine).toBeTrue();
    expect(component.apiError).toBeUndefined();
    expect(component.successMessage).toBe('');
    expect(component.close.emit).toHaveBeenCalled();
  });

  it('should call closeModal when onClose is called', () => {
    spyOn(component, 'closeModal');

    component.onClose();

    expect(component.closeModal).toHaveBeenCalled();
  });
});
