import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ReportsAudits } from './reports-audits';

describe('ReportsAudits', () => {
  let component: ReportsAudits;
  let fixture: ComponentFixture<ReportsAudits>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ReportsAudits]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ReportsAudits);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
