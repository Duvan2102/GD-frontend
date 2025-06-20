import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ControlesPieDePagina} from './controles-pie-de-pagina';

describe('ControlesPieDePagina', () => {
  let component: ControlesPieDePagina;
  let fixture: ComponentFixture<ControlesPieDePagina>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ControlesPieDePagina]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ControlesPieDePagina);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
