import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PositionsCreation } from './positions-creation';

describe('PositionsCreation', () => {
  let component: PositionsCreation;
  let fixture: ComponentFixture<PositionsCreation>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PositionsCreation]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PositionsCreation);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
