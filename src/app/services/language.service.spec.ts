import { TestBed } from '@angular/core/testing'

import { LanguageService } from './language.service'
import { UnitHelper } from '../../../test-config/unit-test-helper'

fdescribe('LanguageService', () => {
  let unitHelper: UnitHelper
  beforeEach(() => {
    unitHelper = new UnitHelper()

    TestBed.configureTestingModule(unitHelper.testBed({}))
      .compileComponents()
      .catch(console.error)
  })

  it('should be created', () => {
    const service: LanguageService = TestBed.get(LanguageService)
    expect(service).toBeTruthy()
  })

  it('should translate all properties of an object', () => {
    const service: LanguageService = TestBed.get(LanguageService)
    const untranslated = {
      header: 'header',
      subHeader: 'subHeader',
      message: 'message'
    }
    // const translated = service.getTranslatedAlert(untranslated.header)

    // console.log(untranslated, translated)
  })
})
