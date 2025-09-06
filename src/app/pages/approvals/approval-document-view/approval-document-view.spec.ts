import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ApprovalDocumentView } from './approval-document-view';

describe('ApprovalDocumentView', () => {
  let component: ApprovalDocumentView;
  let fixture: ComponentFixture<ApprovalDocumentView>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ApprovalDocumentView]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ApprovalDocumentView);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
