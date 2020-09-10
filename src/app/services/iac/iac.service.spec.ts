import { TestBed } from '@angular/core/testing'

import { IACService } from './iac.service'

describe('IacService', () => {
  let service: IACService

  beforeEach(() => {
    TestBed.configureTestingModule({})
    service = TestBed.inject(IACService)
  })

  it('should be created', () => {
    expect(service).toBeTruthy()
  })
})
