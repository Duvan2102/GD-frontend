import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ApprovalRequest } from './approval-request';

describe('ApprovalRequest', () => {
  let component: ApprovalRequest;
  let fixture: ComponentFixture<ApprovalRequest>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ApprovalRequest]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ApprovalRequest);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
