import { TestBed } from '@angular/core/testing'

import { UnitHelper } from '../../../../test-config/unit-test-helper'

import { SerializerService } from './serializer.service'

describe('SerializerService', () => {
  let unitHelper: UnitHelper

  beforeEach(() => {
    unitHelper = new UnitHelper()
    TestBed.configureTestingModule(unitHelper.testBed({}))
      .compileComponents()
      .catch(console.error)
  })

  it('should be created', () => {
    const service: SerializerService = TestBed.get(SerializerService)
    expect(service).toBeTruthy()
  })
})
