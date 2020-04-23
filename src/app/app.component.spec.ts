import { TestBed } from '@angular/core/testing'
import { AppVersion } from '@ionic-native/app-version/ngx'

import { UnitHelper } from '../../test-config/unit-test-helper'
import { APP_PLUGIN, SPLASH_SCREEN_PLUGIN, STATUS_BAR_PLUGIN } from './capacitor-plugins/injection-tokens'

import { AppComponent } from './app.component'

describe('AppComponent', () => {
  let unitHelper: UnitHelper
  beforeEach(() => {
    unitHelper = new UnitHelper()

    TestBed.configureTestingModule(
      unitHelper.testBed({
        providers: [
          { provide: APP_PLUGIN, useValue: unitHelper.mockRefs.app },
          { provide: STATUS_BAR_PLUGIN, useValue: unitHelper.mockRefs.statusBar },
          { provide: SPLASH_SCREEN_PLUGIN, useValue: unitHelper.mockRefs.splashScreen },
          { provide: AppVersion, useValue: unitHelper.mockRefs.appVersion }
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
    expect(unitHelper.mockRefs.appVersion.getAppName).toHaveBeenCalled()
    expect(unitHelper.mockRefs.appVersion.getPackageName).toHaveBeenCalled()
    expect(unitHelper.mockRefs.appVersion.getVersionCode).toHaveBeenCalled()
    expect(unitHelper.mockRefs.appVersion.getVersionNumber).toHaveBeenCalled()
  })
  */

  // TODO: add more tests!
})
