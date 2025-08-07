import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TipologyCreation } from './tipology-creation';

describe('TipologyCreation', () => {
  let component: TipologyCreation;
  let fixture: ComponentFixture<TipologyCreation>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TipologyCreation]
    })
    .compileComponents();

    fixture = TestBed.createComponent(TipologyCreation);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
