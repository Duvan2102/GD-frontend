import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TablaSolicitudes } from './tabla-solicitudes';

describe('TablaSolicitudes', () => {
  let component: TablaSolicitudes;
  let fixture: ComponentFixture<TablaSolicitudes>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TablaSolicitudes]
    })
    .compileComponents();

    fixture = TestBed.createComponent(TablaSolicitudes);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
