import { async, ComponentFixture, TestBed } from '@angular/core/testing'
import { IonicModule } from '@ionic/angular'

import { HealthPage } from './health.page'

describe('HealthPage', () => {
  let component: HealthPage
  let fixture: ComponentFixture<HealthPage>

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [HealthPage],
      imports: [IonicModule.forRoot()]
    }).compileComponents()

    fixture = TestBed.createComponent(HealthPage)
    component = fixture.componentInstance
    fixture.detectChanges()
  }))

  it('should create', () => {
    expect(component).toBeTruthy()
  })
})
