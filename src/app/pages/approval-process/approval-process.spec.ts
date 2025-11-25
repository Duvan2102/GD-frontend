import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ApprovalProcess } from './approval-process';

describe('ApprovalProcess', () => {
  let component: ApprovalProcess;
  let fixture: ComponentFixture<ApprovalProcess>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ApprovalProcess]
    }).compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(ApprovalProcess);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

