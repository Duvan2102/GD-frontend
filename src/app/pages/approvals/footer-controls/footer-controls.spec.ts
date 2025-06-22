import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FooterControls} from './footer-controls';

describe('FooterControls', () => {
  let component: FooterControls;
  let fixture: ComponentFixture<FooterControls>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FooterControls]
    })
    .compileComponents();

    fixture = TestBed.createComponent(FooterControls);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});