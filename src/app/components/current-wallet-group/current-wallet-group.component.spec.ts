import { async, ComponentFixture, TestBed } from '@angular/core/testing'
import { IonicModule } from '@ionic/angular'

import { CurrentWalletGroupComponent } from './current-wallet-group.component'

describe('CurrentWalletGroupComponent', () => {
  let component: CurrentWalletGroupComponent
  let fixture: ComponentFixture<CurrentWalletGroupComponent>

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [CurrentWalletGroupComponent],
      imports: [IonicModule.forRoot()]
    }).compileComponents()

    fixture = TestBed.createComponent(CurrentWalletGroupComponent)
    component = fixture.componentInstance
    fixture.detectChanges()
  }))

  it('should create', () => {
    expect(component).toBeTruthy()
  })
})
