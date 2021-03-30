import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing'

import { UnitHelper } from '../../../../test-config/unit-test-helper'

import { CurrentWalletGroupComponent } from './current-wallet-group.component'

describe('CurrentWalletGroupComponent', () => {
  let component: CurrentWalletGroupComponent
  let fixture: ComponentFixture<CurrentWalletGroupComponent>

  let unitHelper: UnitHelper

  beforeEach(
    waitForAsync(() => {
      unitHelper = new UnitHelper()

      TestBed.configureTestingModule(
        unitHelper.testBed({
          declarations: [CurrentWalletGroupComponent]
        })
      )
        .compileComponents()
        .catch(console.error)

      fixture = TestBed.createComponent(CurrentWalletGroupComponent)
      component = fixture.componentInstance
      fixture.detectChanges()
    })
  )

  it('should create', () => {
    expect(component).toBeTruthy()
  })
})
