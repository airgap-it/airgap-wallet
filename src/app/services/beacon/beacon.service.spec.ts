import { TestBed } from '@angular/core/testing'

import { UnitHelper } from '../../../../test-config/unit-test-helper'

import { BeaconService } from './beacon.service'

describe('BeaconService', () => {
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
    const service: BeaconService = TestBed.get(BeaconService)
    expect(service).toBeTruthy()
  })
})
