import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PasswordModal } from './password-modal';

describe('PasswordModal', () => {
  let component: PasswordModal;
  let fixture: ComponentFixture<PasswordModal>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PasswordModal]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PasswordModal);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
