import { TestBed } from '@angular/core/testing'

import { UnitHelper } from '../../../../test-config/unit-test-helper'

import { WalletconnectService } from './walletconnect.service'

describe('WalletconnectService', () => {
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
    const service: WalletconnectService = TestBed.get(WalletconnectService)
    expect(service).toBeTruthy()
  })
})
