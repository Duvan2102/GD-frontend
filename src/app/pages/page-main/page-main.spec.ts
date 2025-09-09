import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PageMain } from './page-main';

describe('PageMain', () => {
  let component: PageMain;
  let fixture: ComponentFixture<PageMain>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PageMain]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PageMain);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
