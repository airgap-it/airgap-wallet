import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core'
import { async, ComponentFixture, TestBed } from '@angular/core/testing'

import { DelegateEditPopoverComponent } from './delegate-edit-popover.component'
import { UnitHelper } from '../../../../test-config/unit-test-helper'

describe('DelegateEditPopoverComponent', () => {
  let component: DelegateEditPopoverComponent
  let fixture: ComponentFixture<DelegateEditPopoverComponent>

  let unitHelper: UnitHelper
  beforeEach(() => {
    unitHelper = new UnitHelper()

    TestBed.configureTestingModule(unitHelper.testBed({}))
      .compileComponents()
      .catch(console.error)
  })

  beforeEach(() => {
    fixture = TestBed.createComponent(DelegateEditPopoverComponent)
    component = fixture.componentInstance
    fixture.detectChanges()
  })

  it('should create', () => {
    expect(component).toBeTruthy()
  })
})
