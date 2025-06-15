import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Controles } from './controles';

describe('Controles', () => {
  let component: Controles;
  let fixture: ComponentFixture<Controles>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Controles]
    })
    .compileComponents();

    fixture = TestBed.createComponent(Controles);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
