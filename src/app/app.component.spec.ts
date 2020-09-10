import { APP_INFO_PLUGIN, APP_PLUGIN, SPLASH_SCREEN_PLUGIN, STATUS_BAR_PLUGIN } from '@airgap/angular-core'
import { TestBed } from '@angular/core/testing'

import { UnitHelper } from '../../test-config/unit-test-helper'

import { AppComponent } from './app.component'

describe('AppComponent', () => {
  let unitHelper: UnitHelper
  beforeEach(() => {
    unitHelper = new UnitHelper()

    TestBed.configureTestingModule(
      unitHelper.testBed({
        providers: [
          { provide: APP_PLUGIN, useValue: unitHelper.mockRefs.app },
          { provide: APP_INFO_PLUGIN, useValue: unitHelper.mockRefs.appInfo },
          { provide: STATUS_BAR_PLUGIN, useValue: unitHelper.mockRefs.statusBar },
          { provide: SPLASH_SCREEN_PLUGIN, useValue: unitHelper.mockRefs.splashScreen }
        ],
        declarations: [AppComponent]
      })
    )
      .compileComponents()
      .catch(console.error)
  })

  it('should create the app', () => {
    const fixture = TestBed.createComponent(AppComponent)
    const app = fixture.debugElement.componentInstance
    expect(app).toBeTruthy()
  })

  /*
  // TODO: Enable when all native parts are mocked and we can run it as "cordova"
  it('should initialize the app', async () => {
    TestBed.createComponent(AppComponent)
    expect(unitHelper.mockRefs.platform.ready).toHaveBeenCalled()
    expect(unitHelper.mockRefs.statusBar.setStyle).toHaveBeenCalled()
    expect(unitHelper.mockRefs.splashScreen.hide).toHaveBeenCalled()
  })

  it('should initialize the app', async () => {
    TestBed.createComponent(AppComponent)
    expect(unitHelper.mockRefs.appInfo.get).toHaveBeenCalled()
  })
  */

  // TODO: add more tests!
})
