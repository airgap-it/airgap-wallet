import { TestBed } from '@angular/core/testing'

import { CommunicationService } from './communication.service'

describe('CommunicationService', () => {
  beforeEach(() => TestBed.configureTestingModule({}))

  it('should be created', () => {
    const service: CommunicationService = TestBed.get(CommunicationService)
    expect(service).toBeTruthy()
  })
})
