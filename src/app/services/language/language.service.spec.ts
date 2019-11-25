import { TestBed } from '@angular/core/testing'

import { UnitHelper } from '../../../../test-config/unit-test-helper'

import { LanguageService } from './language.service'

describe('LanguageService', () => {
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

  it('should translate all properties of an object', async () => {
    const service: LanguageService = TestBed.get(LanguageService)
    const untranslated = {
      header: 'header',
      message: 'message',
      inputs: [],
      buttons: []
    }

    const translated = await service.getTranslatedAlert(
      untranslated.header,
      untranslated.message,
      untranslated.inputs,
      untranslated.buttons
    )

    // TODO: Add real translations and check if it gets translated
    expect(untranslated.header).toBe(translated.header)
    expect(untranslated.message).toBe(translated.message)
    expect(untranslated.inputs).toBe(translated.inputs)
    expect(untranslated.buttons).toBe(translated.buttons)
  })
})
