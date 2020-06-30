import { TestBed } from '@angular/core/testing'

import { UnitHelper } from '../../../../test-config/unit-test-helper'

import { PriceService } from './price.service'

describe('PriceService', () => {
  let unitHelper: UnitHelper
  beforeEach(() => {
    unitHelper = new UnitHelper()

    TestBed.configureTestingModule(unitHelper.testBed({}))
      .compileComponents()
      .catch(console.error)
  })

  it('should be created', () => {
    const service: PriceService = TestBed.get(PriceService)
    expect(service).toBeTruthy()
  })
})
