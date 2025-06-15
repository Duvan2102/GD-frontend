import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ControlesPieDePaginaComponent} from './controles-pie-de-pagina';

describe('ControlesPieDePagina', () => {
  let component: ControlesPieDePaginaComponent;
  let fixture: ComponentFixture<ControlesPieDePaginaComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ControlesPieDePaginaComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ControlesPieDePaginaComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
