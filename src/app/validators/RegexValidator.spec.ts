import { RegexValidator } from './RegexValidator'
import { TestBed } from '@angular/core/testing'
import { UnitHelper } from 'test-config/unit-test-helper'

describe('RegexValidator', () => {
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
    const regexValidator: RegexValidator = TestBed.get(RegexValidator)
    expect(regexValidator).toBeTruthy()
    console.log('CREATED VALIDATOR')
  })

  it('should correctly evaluate regex', () => {
    expect(RegexValidator.isValid(18, 0.0000000000000001)).toBe(true)
  })
})
