import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ModalUser } from './modal-user';

describe('ModalUser', () => {
  let component: ModalUser;
  let fixture: ComponentFixture<ModalUser>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ModalUser]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ModalUser);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
