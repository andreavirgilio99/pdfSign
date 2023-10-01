import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AdblockerDetectorComponent } from './adblocker-detector.component';

describe('AdblockerDetectorComponent', () => {
  let component: AdblockerDetectorComponent;
  let fixture: ComponentFixture<AdblockerDetectorComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ AdblockerDetectorComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AdblockerDetectorComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
