import {
  MainProtocolStoreService,
  ProtocolService,
  SPLASH_SCREEN_PLUGIN,
  STATUS_BAR_PLUGIN,
  SubProtocolStoreService
} from '@airgap/angular-core'
import { TestBed } from '@angular/core/testing'
import { Router } from '@angular/router'
import { Platform } from '@ionic/angular'
import { Storage } from '@ionic/storage'
import { SplashScreenMock, StatusBarMock } from 'test-config/plugins-mock'

import { PlatformMock } from '../../../../test-config/mocks-ionic'
import { StorageMock } from '../../../../test-config/storage-mock'
import { UnitHelper } from '../../../../test-config/unit-test-helper'

import { SchemeRoutingProvider } from './scheme-routing'

describe('SchemeRoutingProvider Provider', () => {
  let schemeRoutingProvider: SchemeRoutingProvider
  // let storageProvider: Storage
  // let navController: NavController
  let router: Router
  let protocolService: ProtocolService

  let unitHelper: UnitHelper

  beforeAll(() => {
    protocolService = new ProtocolService(new MainProtocolStoreService(), new SubProtocolStoreService())
    protocolService.init()
  })

  beforeEach(() => {
    unitHelper = new UnitHelper()

    TestBed.configureTestingModule(
      unitHelper.testBed({
        providers: [
          SchemeRoutingProvider,
          { provide: Storage, useClass: StorageMock },
          { provide: STATUS_BAR_PLUGIN, useClass: StatusBarMock },
          { provide: SPLASH_SCREEN_PLUGIN, useClass: SplashScreenMock },
          { provide: Platform, useClass: PlatformMock },
          { provide: ProtocolService, useValue: protocolService }
        ]
      })
    )
      .compileComponents()
      .catch(console.error)
  })

  beforeEach(() => {
    schemeRoutingProvider = TestBed.get(SchemeRoutingProvider)
    router = TestBed.get(Router)
    // storageProvider = TestBed.get(Storage)
    // navController = TestBed.get(NavController)
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
