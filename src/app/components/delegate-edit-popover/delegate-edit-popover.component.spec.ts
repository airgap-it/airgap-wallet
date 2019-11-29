import { ComponentFixture, TestBed } from '@angular/core/testing'
import { NavParams } from '@ionic/angular'

import { NavParamsMock } from '../../../../test-config/mocks-ionic'
import { UnitHelper } from '../../../../test-config/unit-test-helper'

import { DelegateEditPopoverComponent } from './delegate-edit-popover.component'

describe('DelegateEditPopoverComponent', () => {
  let component: DelegateEditPopoverComponent
  let fixture: ComponentFixture<DelegateEditPopoverComponent>

  let unitHelper: UnitHelper
  beforeEach(() => {
    unitHelper = new UnitHelper()

    TestBed.configureTestingModule(unitHelper.testBed({ providers: [{ provide: NavParams, useClass: NavParamsMock }] }))
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
