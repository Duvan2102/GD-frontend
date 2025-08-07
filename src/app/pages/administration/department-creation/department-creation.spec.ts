import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DepartmentCreation } from './department-creation';

describe('DepartmentCreation', () => {
  let component: DepartmentCreation;
  let fixture: ComponentFixture<DepartmentCreation>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DepartmentCreation]
    })
    .compileComponents();

    fixture = TestBed.createComponent(DepartmentCreation);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
