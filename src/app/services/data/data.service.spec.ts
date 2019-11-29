import { TestBed } from '@angular/core/testing'

import { UnitHelper } from '../../../../test-config/unit-test-helper'

import { DataService } from './data.service'

describe('DataService', () => {
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

  it('should be created', () => {
    const service: DataService = TestBed.get(DataService)
    expect(service).toBeTruthy()
  })
})
