import { async, ComponentFixture, TestBed } from '@angular/core/testing'
import { IonicModule } from '@ionic/angular'

import { PermissionRequestComponent } from './permission-request.component'

describe('PermissionRequestComponent', () => {
  let component: PermissionRequestComponent
  let fixture: ComponentFixture<PermissionRequestComponent>

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [PermissionRequestComponent],
      imports: [IonicModule.forRoot()]
    }).compileComponents()

    fixture = TestBed.createComponent(PermissionRequestComponent)
    component = fixture.componentInstance
    fixture.detectChanges()
  }))

  it('should create', () => {
    expect(component).toBeTruthy()
  })
})
