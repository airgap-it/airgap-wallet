import { TestBed } from '@angular/core/testing'

import { UnitHelper } from '../../../../test-config/unit-test-helper'

import { CommunicationService } from './communication.service'

describe('CommunicationService', () => {
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
    const service: CommunicationService = TestBed.get(CommunicationService)
    expect(service).toBeTruthy()
  })
})
