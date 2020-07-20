import { TestBed } from '@angular/core/testing'

import { WalletconnectService } from './walletconnect.service'

describe('WalletconnectService', () => {
  beforeEach(() => TestBed.configureTestingModule({}))

  it('should be created', () => {
    const service: WalletconnectService = TestBed.get(WalletconnectService)
    expect(service).toBeTruthy()
  })
})
