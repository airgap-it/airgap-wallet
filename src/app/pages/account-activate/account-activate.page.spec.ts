import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing'
import { provideMockStore } from '@ngrx/store/testing'

import { UnitHelper } from '../../../../test-config/unit-test-helper'

import { AccountActivatePage } from './account-activate.page'
import * as fromAccountActivate from './account-activate.reducers'

describe('AccountActivatePage', () => {
  let component: AccountActivatePage
  let fixture: ComponentFixture<AccountActivatePage>

  let unitHelper: UnitHelper

  const initialState: Partial<fromAccountActivate.State> = {
    accountActivate: fromAccountActivate.initialState
  }

  beforeEach(
    waitForAsync(() => {
      unitHelper = new UnitHelper()

      TestBed.configureTestingModule(
        unitHelper.testBed({
          declarations: [AccountActivatePage],
          providers: [provideMockStore({ initialState })]
        })
      )
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
