import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DocumentView } from './document-view';

describe('DocumentView', () => {
  let component: DocumentView;
  let fixture: ComponentFixture<DocumentView>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DocumentView]
    })
    .compileComponents();

    fixture = TestBed.createComponent(DocumentView);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
