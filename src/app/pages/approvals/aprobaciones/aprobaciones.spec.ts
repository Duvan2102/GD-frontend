import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Aprobaciones } from './aprobaciones';

describe('Aprobaciones', () => {
  let component: Aprobaciones;
  let fixture: ComponentFixture<Aprobaciones>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Aprobaciones] 
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(Aprobaciones);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
