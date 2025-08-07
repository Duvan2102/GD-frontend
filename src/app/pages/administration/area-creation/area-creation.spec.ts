import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AreaCreation } from './area-creation';

describe('AreaCreation', () => {
  let component: AreaCreation;
  let fixture: ComponentFixture<AreaCreation>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AreaCreation]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AreaCreation);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
