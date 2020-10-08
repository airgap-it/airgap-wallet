import { APP_CONFIG, APP_INFO_PLUGIN, PermissionsService, PERMISSIONS_PLUGIN } from '@airgap/angular-core'
import { CommonModule } from '@angular/common'
import { HttpClientModule } from '@angular/common/http'
import { TestModuleMetadata } from '@angular/core/testing'
import { FormsModule, ReactiveFormsModule } from '@angular/forms'
import { RouterTestingModule } from '@angular/router/testing'
import { AlertController, IonicModule, LoadingController, NavController, Platform, ToastController } from '@ionic/angular'
import { IonicStorageModule, Storage } from '@ionic/storage'
import { TranslateFakeLoader, TranslateLoader, TranslateModule } from '@ngx-translate/core'
import { MomentModule } from 'ngx-moment'
import { PUSH_NOTIFICATIONS_PLUGIN } from 'src/app/capacitor-plugins/injection-tokens'
import { appConfig } from 'src/app/config/app-config'

import { ComponentsModule } from '../src/app/components/components.module'
import { PipesModule } from '../src/app/pipes/pipes.module'
import { DrawChartService } from '../src/app/services/draw-chart/draw-chart.service'

import {
  AlertControllerMock,
  DeeplinkMock,
  LoadingControllerMock,
  ModalControllerMock,
  NavControllerMock,
  PlatformMock,
  ToastControllerMock
} from './mocks-ionic'
import {
  AppInfoPluginMock,
  AppMock,
  PermissionsMock,
  PermissionsPluginMock,
  PushNotificationsMock,
  SplashScreenMock,
  StatusBarMock
} from './plugins-mock'
import { PermissionsServiceMock } from './service-mock'
import { StorageMock } from './storage-mock'

export class UnitHelper {
  public readonly mockRefs = {
    app: new AppMock(),
    appInfoPlugin: new AppInfoPluginMock(),
    platform: new PlatformMock(),
    permissions: new PermissionsMock(),
    permissionsPlugin: new PermissionsPluginMock(),
    permissionsProvider: new PermissionsServiceMock(),
    pushNotifications: new PushNotificationsMock(),
    statusBar: new StatusBarMock(),
    splashScreen: new SplashScreenMock(),
    deeplink: new DeeplinkMock(),
    toastController: new ToastControllerMock(),
    alertController: new AlertControllerMock(),
    loadingController: new LoadingControllerMock(),
    modalController: new ModalControllerMock()
  }

  public testBed(testBed: TestModuleMetadata, useIonicOnlyTestBed: boolean = false): TestModuleMetadata {
    const mandatoryDeclarations: any[] = []
    const mandatoryImports: any[] = [
      CommonModule,
      ReactiveFormsModule,
      IonicModule,
      FormsModule,
      RouterTestingModule,
      HttpClientModule,
      ComponentsModule,
      IonicStorageModule.forRoot({
        name: '__test_airgap_storage',
        driverOrder: ['localstorage']
      }),
      MomentModule,
      TranslateModule.forRoot({
        loader: { provide: TranslateLoader, useClass: TranslateFakeLoader }
      })
    ]
    const mandatoryProviders: any[] = [
      DrawChartService,
      { provide: Storage, useClass: StorageMock },
      { provide: NavController, useClass: NavControllerMock },
      { provide: Platform, useValue: this.mockRefs.platform },
      { provide: PermissionsService, useValue: this.mockRefs.permissionsProvider },
      { provide: PERMISSIONS_PLUGIN, useValue: this.mockRefs.permissionsPlugin },
      { provide: PUSH_NOTIFICATIONS_PLUGIN, useValue: this.mockRefs.pushNotifications },
      { provide: APP_INFO_PLUGIN, useValue: this.mockRefs.appInfoPlugin },
      { provide: APP_CONFIG, useValue: appConfig },
      { provide: ToastController, useValue: this.mockRefs.toastController },
      { provide: AlertController, useValue: this.mockRefs.alertController },
      { provide: LoadingController, useValue: this.mockRefs.loadingController }
    ]

    if (!useIonicOnlyTestBed) {
      mandatoryProviders.push({ provide: Storage, useClass: StorageMock })
      mandatoryDeclarations.push()
      mandatoryImports.push(PipesModule)
    }

    testBed.declarations = [...(testBed.declarations || []), ...mandatoryDeclarations]
    testBed.imports = [...(testBed.imports || []), ...mandatoryImports]
    testBed.providers = [...(testBed.providers || []), ...mandatoryProviders]

    return testBed
  }
}

export const newSpy: (name: string, returnValue: any) => jasmine.Spy = (name: string, returnValue: any): jasmine.Spy =>
  jasmine.createSpy(name).and.returnValue(returnValue)
