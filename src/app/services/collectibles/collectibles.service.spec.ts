import { APP_INFO_PLUGIN, APP_PLUGIN, FILESYSTEM_PLUGIN, PermissionsService, ProtocolService, ZIP_PLUGIN } from '@airgap/angular-core'
import { TestBed } from '@angular/core/testing'
import { FILE_PICKER_PLUGIN, PUSH_NOTIFICATIONS_PLUGIN } from 'src/app/capacitor-plugins/injection-tokens'

import { UnitHelper } from '../../../../test-config/unit-test-helper'

import { CollectiblesService } from './collectibles.service'

describe('CollectiblesService', () => {
  let collectiblesService: CollectiblesService
  let protocolService: ProtocolService
  let unitHelper: UnitHelper

  beforeEach(async () => {
    unitHelper = new UnitHelper()
    await TestBed.configureTestingModule(
      unitHelper.testBed({
        providers: [
          { provide: PermissionsService, useValue: unitHelper.mockRefs.permissionsProvider },
          { provide: APP_PLUGIN, useValue: unitHelper.mockRefs.app },
          { provide: APP_INFO_PLUGIN, useValue: unitHelper.mockRefs.appInfo },
          { provide: PUSH_NOTIFICATIONS_PLUGIN, useValue: unitHelper.mockRefs.pushNotifications },
          { provide: ZIP_PLUGIN, useValue: unitHelper.mockRefs.zip },
          { provide: FILE_PICKER_PLUGIN, useValue: unitHelper.mockRefs.filePicker },
          { provide: FILESYSTEM_PLUGIN, useValue: unitHelper.mockRefs.filesystem }
        ]
      })
    )
      .compileComponents()
      .catch(console.error)

    protocolService = TestBed.inject(ProtocolService)
    await protocolService.init()
    collectiblesService = TestBed.inject(CollectiblesService)
  })

  it('should be created', () => {
    expect(collectiblesService).toBeTruthy()
  })
})
