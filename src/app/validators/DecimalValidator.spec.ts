import { TestBed } from '@angular/core/testing'
import { UnitHelper } from '../../../test-config/unit-test-helper'

import { DecimalValidator } from './DecimalValidator'

describe('DecimalValidator', () => {
  let unitHelper: UnitHelper
  beforeEach(() => {
    unitHelper = new UnitHelper()

    TestBed.configureTestingModule(
      unitHelper.testBed({
        providers: []
      })
    )
      .compileComponents()
      .catch(console.error)
  })

  it('should correctly evaluate regex', () => {
    expect(DecimalValidator.isValid(18, 0.0000000000000001)).toBe(true)
  })
})
