import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing'
import { IonicModule } from '@ionic/angular'

import { AccountActivatePage } from './account-activate.page'

describe('AccountActivatePage', () => {
  let component: AccountActivatePage
  let fixture: ComponentFixture<AccountActivatePage>

  beforeEach(
    waitForAsync(() => {
      TestBed.configureTestingModule({
        declarations: [AccountActivatePage],
        imports: [IonicModule.forRoot()]
      })
        .compileComponents()
        .catch(console.error)

      fixture = TestBed.createComponent(AccountActivatePage)
      component = fixture.componentInstance
      fixture.detectChanges()
    })
  )

  it('should create', () => {
    expect(component).toBeTruthy()
  })
})
