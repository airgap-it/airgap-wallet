import { async, ComponentFixture, TestBed } from '@angular/core/testing'
import { IonicModule } from '@ionic/angular'

import { WalletconnectPage } from './walletconnect.page'

describe('WalletconnectPage', () => {
  let component: WalletconnectPage
  let fixture: ComponentFixture<WalletconnectPage>

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [WalletconnectPage],
      imports: [IonicModule.forRoot()]
    }).compileComponents()

    fixture = TestBed.createComponent(WalletconnectPage)
    component = fixture.componentInstance
    fixture.detectChanges()
  }))

  it('should create', () => {
    expect(component).toBeTruthy()
  })
})
