import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing'
import { UnitHelper } from 'test-config/unit-test-helper'

import { ExchangeSelectionComponent } from './exchange-selection.component'

describe('ExchangeSelectionComponent', () => {
  let component: ExchangeSelectionComponent
  let fixture: ComponentFixture<ExchangeSelectionComponent>

  let unitHelper: UnitHelper

  beforeEach(
    waitForAsync(() => {
      unitHelper = new UnitHelper()
      TestBed.configureTestingModule(
        unitHelper.testBed({
          declarations: [ExchangeSelectionComponent]
        })
      )
        .compileComponents()
        .catch(console.error)

      fixture = TestBed.createComponent(ExchangeSelectionComponent)
      component = fixture.componentInstance
      fixture.detectChanges()
    })
  )

  it('should create', () => {
    expect(component).toBeTruthy()
  })
})
