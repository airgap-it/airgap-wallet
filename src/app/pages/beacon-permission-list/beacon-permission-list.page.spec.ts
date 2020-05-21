import { async, ComponentFixture, TestBed } from '@angular/core/testing'
import { IonicModule } from '@ionic/angular'

import { BeaconPermissionListPage } from './beacon-permission-list.page'

describe('BeaconPermissionListPage', () => {
  let component: BeaconPermissionListPage
  let fixture: ComponentFixture<BeaconPermissionListPage>

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [BeaconPermissionListPage],
      imports: [IonicModule.forRoot()]
    }).compileComponents()

    fixture = TestBed.createComponent(BeaconPermissionListPage)
    component = fixture.componentInstance
    fixture.detectChanges()
  }))

  it('should create', () => {
    expect(component).toBeTruthy()
  })
})
