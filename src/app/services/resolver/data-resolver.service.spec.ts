import { TestBed } from '@angular/core/testing'

import { UnitHelper } from '../../../../test-config/unit-test-helper'

import { DataResolverService } from './data-resolver.service'

describe('DataResolverService', () => {
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
    const service: DataResolverService = TestBed.get(DataResolverService)
    expect(service).toBeTruthy()
  })
})
