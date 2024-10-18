import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DialogSelectingManaComponent } from './dialog-selecting-mana.component';

describe('DialogSelectingManaComponent', () => {
  let component: DialogSelectingManaComponent;
  let fixture: ComponentFixture<DialogSelectingManaComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DialogSelectingManaComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(DialogSelectingManaComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
