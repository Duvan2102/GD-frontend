import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { of } from 'rxjs';

import { LoginComponent } from './login.component';
import { AuthService } from '../../services/auth.service';

describe('LoginComponent', () => {
  let component: LoginComponent;
  let fixture: ComponentFixture<LoginComponent>;
  let mockAuthService: jasmine.SpyObj<AuthService>;
  let mockRouter: jasmine.SpyObj<Router>;

  beforeEach(async () => {
    const authServiceSpy = jasmine.createSpyObj('AuthService', ['login', 'getCurrentUserValue']);
    const routerSpy = jasmine.createSpyObj('Router', ['navigate']);

    await TestBed.configureTestingModule({
      imports: [ReactiveFormsModule],
      declarations: [LoginComponent],
      providers: [
        { provide: AuthService, useValue: authServiceSpy },
        { provide: Router, useValue: routerSpy }
      ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(LoginComponent);
    component = fixture.componentInstance;
    mockAuthService = TestBed.inject(AuthService) as jasmine.SpyObj<AuthService>;
    mockRouter = TestBed.inject(Router) as jasmine.SpyObj<Router>;
  });

  beforeEach(() => {
    mockAuthService.getCurrentUserValue.and.returnValue(null);
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize form with empty values', () => {
    expect(component.loginForm.get('usuario')?.value).toBe('');
    expect(component.loginForm.get('password')?.value).toBe('');
  });

  it('should validate required fields', () => {
    component.loginForm.patchValue({ usuario: '', password: '' });
    component.onSubmit();

    expect(component.loginForm.get('usuario')?.hasError('required')).toBeTruthy();
    expect(component.loginForm.get('password')?.hasError('required')).toBeTruthy();
  });

  it('should call authService.login when form is valid', () => {
    mockAuthService.login.and.returnValue(true);
    component.loginForm.patchValue({ usuario: 'test', password: '1234' });

    component.onSubmit();

    expect(mockAuthService.login).toHaveBeenCalledWith('test', '1234');
  });

  it('should navigate to home on successful login', () => {
    mockAuthService.login.and.returnValue(true);
    component.loginForm.patchValue({ usuario: 'test', password: '1234' });

    component.onSubmit();

    setTimeout(() => {
      expect(mockRouter.navigate).toHaveBeenCalledWith(['/']);
    }, 1100);
  });
});


