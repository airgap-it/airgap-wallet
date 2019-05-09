/*import { async, TestBed } from '@angular/core/testing'
import { NavController, Platform, AlertController, LoadingController } from '@ionic/angular'
import { Router, NavigationExtras } from '@angular/router'
import { StatusBar } from '@ionic-native/status-bar'
import 'jasmine'
import { SplashScreen } from '@ionic-native/splash-screen'

import { PlatformMock, StatusBarMock, SplashScreenMock, AlertControllerMock } from '../../../../test-config/mocks-ionic'
import { SchemeRoutingProvider } from './scheme-routing'

import { StorageMock } from '../../../../test-config/storage-mock'
import { Storage } from '@ionic/storage'

describe('SchemeRoutingProvider Provider', () => {
  let schemeRoutingProvider: SchemeRoutingProvider
  let storageProvider: Storage
  let navController: NavController
  let router: Router

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      providers: [
        SchemeRoutingProvider,
        {
          provide: AlertController,
          useValue: AlertControllerMock
        },
        { provide: Storage, useClass: StorageMock },
        { provide: StatusBar, useClass: StatusBarMock },
        { provide: SplashScreen, useClass: SplashScreenMock },
        { provide: Platform, useClass: PlatformMock }
      ]
    })
  }))

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

  it('should handle request', async done => {
    const text: string = 'test'
    const callback = () => undefined
    await schemeRoutingProvider.handleNewSyncRequest(router, text, callback)
    done()
  })
})
*/
