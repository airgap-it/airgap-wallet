import { APP_PLUGIN, FILESYSTEM_PLUGIN, ZIP_PLUGIN } from '@airgap/angular-core'
import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing'
import { FILE_PICKER_PLUGIN } from 'src/app/capacitor-plugins/injection-tokens'

import { UnitHelper } from '../../../../test-config/unit-test-helper'

import { CurrentWalletGroupComponent } from './current-wallet-group.component'

describe('CurrentWalletGroupComponent', () => {
  let component: CurrentWalletGroupComponent
  let fixture: ComponentFixture<CurrentWalletGroupComponent>

  let unitHelper: UnitHelper

  beforeEach(
    waitForAsync(() => {
      unitHelper = new UnitHelper()

      TestBed.configureTestingModule(
        unitHelper.testBed({
          declarations: [CurrentWalletGroupComponent],
          providers: [
            { provide: APP_PLUGIN, useValue: unitHelper.mockRefs.app },
            { provide: ZIP_PLUGIN, useValue: unitHelper.mockRefs.zip },
            { provide: FILE_PICKER_PLUGIN, useValue: unitHelper.mockRefs.filePicker },
            { provide: FILESYSTEM_PLUGIN, useValue: unitHelper.mockRefs.filesystem }
          ]
        })
      )
        .compileComponents()
        .catch(console.error)

      fixture = TestBed.createComponent(CurrentWalletGroupComponent)
      component = fixture.componentInstance
      fixture.detectChanges()
    })
  )

  it('should create', () => {
    expect(component).toBeTruthy()
  })
})
