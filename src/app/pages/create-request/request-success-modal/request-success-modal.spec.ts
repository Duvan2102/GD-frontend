import { ComponentFixture, TestBed } from '@angular/core/testing';

import { RequestSuccessModal } from './request-success-modal';

describe('RequestSuccessModal', () => {
  let component: RequestSuccessModal;
  let fixture: ComponentFixture<RequestSuccessModal>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RequestSuccessModal]
    })
    .compileComponents();

    fixture = TestBed.createComponent(RequestSuccessModal);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
