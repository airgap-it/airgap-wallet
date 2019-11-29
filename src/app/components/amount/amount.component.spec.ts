import { ComponentFixture, TestBed } from '@angular/core/testing'

import { UnitHelper } from '../../../../test-config/unit-test-helper'

import { AmountComponent } from './amount.component'

describe('AmountComponent', () => {
  let component: AmountComponent
  let fixture: ComponentFixture<AmountComponent>

  let unitHelper: UnitHelper
  beforeEach(() => {
    unitHelper = new UnitHelper()
    TestBed.configureTestingModule(
      unitHelper.testBed({
        declarations: []
      })
    )
      .compileComponents()
      .catch(console.error)
  })

  beforeEach(() => {
    fixture = TestBed.createComponent(AmountComponent)
    component = fixture.componentInstance
    fixture.detectChanges()
  })

  it('should create', () => {
    expect(component).toBeTruthy()
  })
})
