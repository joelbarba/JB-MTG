import { ComponentFixture, TestBed } from '@angular/core/testing';

import { GamesRoomComponent } from './games-room.component';

describe('GamesRoomComponent', () => {
  let component: GamesRoomComponent;
  let fixture: ComponentFixture<GamesRoomComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [GamesRoomComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(GamesRoomComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
