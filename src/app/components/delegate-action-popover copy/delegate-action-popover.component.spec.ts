import { ComponentFixture, TestBed } from '@angular/core/testing'
import { NavParams } from '@ionic/angular'

import { NavParamsMock } from '../../../../test-config/mocks-ionic'
import { UnitHelper } from '../../../../test-config/unit-test-helper'

import { DelegateActionPopoverComponent } from './delegate-action-popover.component'

describe('DelegateActionPopoverComponent', () => {
  let component: DelegateActionPopoverComponent
  let fixture: ComponentFixture<DelegateActionPopoverComponent>

  let unitHelper: UnitHelper
  beforeEach(() => {
    unitHelper = new UnitHelper()

    TestBed.configureTestingModule(unitHelper.testBed({ providers: [{ provide: NavParams, useClass: NavParamsMock }] }))
      .compileComponents()
      .catch(console.error)
  })

  beforeEach(() => {
    fixture = TestBed.createComponent(DelegateActionPopoverComponent)
    component = fixture.componentInstance
    fixture.detectChanges()
  })

  it('should create', () => {
    expect(component).toBeTruthy()
  })
})
