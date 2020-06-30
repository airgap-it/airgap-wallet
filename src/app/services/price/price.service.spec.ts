import { TestBed } from '@angular/core/testing'

import { PriceService } from './price.service'

describe('PriceService', () => {
  beforeEach(() => TestBed.configureTestingModule({}))

  it('should be created', () => {
    const service: PriceService = TestBed.get(PriceService)
    expect(service).toBeTruthy()
  })
})
