import { async, ComponentFixture, TestBed } from '@angular/core/testing'
import { IonicModule } from '@ionic/angular'

import { SettingsBeaconPage } from './settings-beacon.page'

describe('SettingsBeaconPage', () => {
  let component: SettingsBeaconPage
  let fixture: ComponentFixture<SettingsBeaconPage>

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [SettingsBeaconPage],
      imports: [IonicModule.forRoot()]
    }).compileComponents()

    fixture = TestBed.createComponent(SettingsBeaconPage)
    component = fixture.componentInstance
    fixture.detectChanges()
  }))

  it('should create', () => {
    expect(component).toBeTruthy()
  })
})
