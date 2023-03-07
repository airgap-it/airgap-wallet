import { APP_CONFIG, APP_INFO_PLUGIN, APP_LAUNCHER_PLUGIN, FILESYSTEM_PLUGIN, ISOLATED_MODULES_PLUGIN, PermissionsService, WebIsolatedModules } from '@airgap/angular-core'
import { CommonModule } from '@angular/common'
import { HttpClientModule } from '@angular/common/http'
import { TestModuleMetadata } from '@angular/core/testing'
import { FormsModule, ReactiveFormsModule } from '@angular/forms'
import { RouterTestingModule } from '@angular/router/testing'
import { AlertController, IonicModule, LoadingController, NavController, Platform, ToastController } from '@ionic/angular'
import { Storage } from '@ionic/storage'
import { IonicStorageModule } from '@ionic/storage'
import { StoreModule } from '@ngrx/store'
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
  AppInfoMock,
  AppLauncherMock,
  AppMock,
  ClipboardMock,
  FilesystemMock,
  PermissionsMock,
  PushNotificationsMock,
  SaplingNativeMock,
  SplashScreenMock,
  StatusBarMock,
  ZipMock
} from './plugins-mock'
import { PermissionsServiceMock } from './service-mock'
import { StorageMock } from './storage-mock'

export class UnitHelper {
  public readonly mockRefs = {
    app: new AppMock(),
    appInfo: new AppInfoMock(),
    appLauncher: new AppLauncherMock(),
    filesystem: new FilesystemMock(),
    platform: new PlatformMock(),
    permissions: new PermissionsMock(),
    permissionsProvider: new PermissionsServiceMock(),
    pushNotifications: new PushNotificationsMock(),
    saplingNative: new SaplingNativeMock(),
    statusBar: new StatusBarMock(),
    splashScreen: new SplashScreenMock(),
    clipboard: new ClipboardMock(),
    deeplink: new DeeplinkMock(),
    toastController: new ToastControllerMock(),
    alertController: new AlertControllerMock(),
    loadingController: new LoadingControllerMock(),
    modalController: new ModalControllerMock(),
    zip: new ZipMock()
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
      }),
      StoreModule.forRoot({})
    ]
    const mandatoryProviders: any[] = [
      DrawChartService,
      { provide: Storage, useClass: StorageMock },
      { provide: NavController, useClass: NavControllerMock },
      { provide: Platform, useValue: this.mockRefs.platform },
      { provide: PermissionsService, useValue: this.mockRefs.permissionsProvider },
      { provide: PUSH_NOTIFICATIONS_PLUGIN, useValue: this.mockRefs.pushNotifications },
      { provide: APP_INFO_PLUGIN, useValue: this.mockRefs.appInfo },
      { provide: APP_LAUNCHER_PLUGIN, useValue: this.mockRefs.appLauncher },
      { provide: FILESYSTEM_PLUGIN, useValue: this.mockRefs.filesystem },
      { provide: APP_CONFIG, useValue: appConfig },
      { provide: ISOLATED_MODULES_PLUGIN, useValue: new WebIsolatedModules() },
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
