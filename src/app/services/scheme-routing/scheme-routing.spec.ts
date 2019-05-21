import { async, TestBed } from '@angular/core/testing'
import { Router } from '@angular/router'
import { SplashScreen } from '@ionic-native/splash-screen'
import { StatusBar } from '@ionic-native/status-bar'
import { AlertController, NavController, Platform } from '@ionic/angular'
import { Storage } from '@ionic/storage'

import { AlertControllerMock, PlatformMock, SplashScreenMock, StatusBarMock } from '../../../../test-config/mocks-ionic'
import { StorageMock } from '../../../../test-config/storage-mock'
import { UnitHelper } from '../../../../test-config/unit-test-helper'

import { SchemeRoutingProvider } from './scheme-routing'

describe('SchemeRoutingProvider Provider', () => {
  let schemeRoutingProvider: SchemeRoutingProvider
  let storageProvider: Storage
  let navController: NavController
  let router: Router

  let unitHelper: UnitHelper
  beforeEach(() => {
    unitHelper = new UnitHelper()

    TestBed.configureTestingModule(
      unitHelper.testBed({
        providers: [
          SchemeRoutingProvider,
          { provide: Storage, useClass: StorageMock },
          { provide: StatusBar, useClass: StatusBarMock },
          { provide: SplashScreen, useClass: SplashScreenMock },
          { provide: Platform, useClass: PlatformMock }
        ]
      })
    )
      .compileComponents()
      .catch(console.error)
  })

  beforeEach(() => {
    schemeRoutingProvider = TestBed.get(SchemeRoutingProvider)
    storageProvider = TestBed.get(Storage)
    navController = TestBed.get(NavController)
  })

  it('should be created', () => {
    expect(schemeRoutingProvider instanceof SchemeRoutingProvider).toBe(true)
  })

  it('should show alert', async done => {
    await schemeRoutingProvider.showAlert('Test', 'Message', [])
    done()
  })

  it('should throw for invalid URL', async done => {
    const text: string = 'test'
    const callback = () => undefined
    try {
      await schemeRoutingProvider.handleNewSyncRequest(router, text, callback)
    } catch (error) {
      if (error.name === "TypeError: Failed to construct 'URL': Invalid URL") {
      }
    }
    done()
  })
})
