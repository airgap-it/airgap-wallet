import {
  AirGapAngularCoreModule,
  AirGapTranslateLoader,
  AppInfo,
  APP_CONFIG,
  APP_INFO_PLUGIN,
  APP_LAUNCHER_PLUGIN,
  APP_PLUGIN,
  BaseEnvironmentService,
  BaseModulesService,
  ClipboardService,
  CLIPBOARD_PLUGIN,
  DeeplinkService,
  FeeConverterPipe,
  FILESYSTEM_PLUGIN,
  isolatedModules,
  ISOLATED_MODULES_PLUGIN,
  PermissionsService,
  QrScannerService,
  SerializerService,
  SPLASH_SCREEN_PLUGIN,
  STATUS_BAR_PLUGIN,
  Zip,
  ZIP_PLUGIN
} from '@airgap/angular-core'
import {
  AirGapAngularNgRxModule,
  currencySymbolNgRxFacade,
  isolatedModulesDetailsNgRxFacade,
  isolatedModulesListNgRxFacade,
  isolatedModulesListPageNgRxFacade
} from '@airgap/angular-ngrx'
import { CommonModule, DecimalPipe, PercentPipe } from '@angular/common'
import { HttpClient, HttpClientModule } from '@angular/common/http'
import { NgModule } from '@angular/core'
import { FormsModule, ReactiveFormsModule } from '@angular/forms'
import { BrowserModule } from '@angular/platform-browser'
import { BrowserAnimationsModule } from '@angular/platform-browser/animations'
import { RouteReuseStrategy } from '@angular/router'
import { App } from '@capacitor/app'
import { AppLauncher } from '@capacitor/app-launcher'
import { Browser } from '@capacitor/browser'
import { Clipboard } from '@capacitor/clipboard'
import { Filesystem } from '@capacitor/filesystem'
import { PushNotifications } from '@capacitor/push-notifications'
import { Share } from '@capacitor/share'
import { SplashScreen } from '@capacitor/splash-screen'
import { StatusBar } from '@capacitor/status-bar'
import { FilePicker } from '@capawesome/capacitor-file-picker'
import { Diagnostic } from '@ionic-native/diagnostic/ngx'
import { IonicModule, IonicRouteStrategy, Platform } from '@ionic/angular'
import { Drivers } from '@ionic/storage'
import { IonicStorageModule } from '@ionic/storage-angular'
import { StoreModule } from '@ngrx/store'
import { TranslateLoader, TranslateModule } from '@ngx-translate/core'
import { ZXingScannerModule } from '@zxing/ngx-scanner'
import CordovaSQLiteDriver from 'localforage-cordovasqlitedriver'
import { MomentModule } from 'ngx-moment'

import { AppRoutingModule } from './app-routing.module'
import { AppComponent } from './app.component'
import { metaReducers, ROOT_REDUCERS } from './app.reducers'
import { SaplingNative } from './capacitor-plugins/definitions'
import {
  BROWSER_PLUGIN,
  FILE_PICKER_PLUGIN,
  PUSH_NOTIFICATIONS_PLUGIN,
  SAPLING_PLUGIN,
  SHARE_PLUGIN
} from './capacitor-plugins/injection-tokens'
import { ComponentsModule } from './components/components.module'
import { appConfig } from './config/app-config'
import { BeaconRequestPageModule } from './pages/beacon-request/beacon-request.module'
import { IntroductionPushPageModule } from './pages/introduction-push/introduction-push.module'
import { IsolatedModulesOnboardingPageModule } from './pages/isolated-modules-onboarding/isolated-modules-onboarding.module'
import { ProtocolSelectPageModule } from './pages/protocol-select/protocol-select.module'
import { PipesModule } from './pipes/pipes.module'
import { ShortenStringPipe } from './pipes/shorten-string/shorten-string.pipe'
import { AccountProvider } from './services/account/account.provider'
import { ThemeService } from './services/appearance/theme.service'
import { CoinlibService } from './services/coinlib/coinlib.service'
import { WalletEnvironmentService } from './services/environment/wallet-environment.service'
import { ExtensionsService } from './services/extensions/extensions.service'
import { ProtocolGuard } from './services/guard/protocol.guard'
import { ServiceKeyGuard } from './services/guard/serviceKey.guard'
import { TransactionHashGuard } from './services/guard/transactionHash.guard'
import { IACService } from './services/iac/iac.service'
import { InteractionService } from './services/interaction/interaction.service'
import { LedgerService } from './services/ledger/ledger-service'
import { MarketDataService } from './services/market-data/market-data.service'
import { WalletModulesService } from './services/modules/modules.service'
import { NavigationService } from './services/navigation/navigation.service'
import { OperationsProvider } from './services/operations/operations'
import { PushBackendProvider } from './services/push-backend/push-backend'
import { PushProvider } from './services/push/push'
import { SaplingService } from './services/sapling/sapling.service'
import { WalletStorageService } from './services/storage/storage'

export function createTranslateLoader(http: HttpClient): AirGapTranslateLoader {
  return new AirGapTranslateLoader(http, { prefix: './assets/i18n/', suffix: '.json' })
}

@NgModule({
  declarations: [AppComponent],
  exports: [],
  imports: [
    BrowserModule,
    BrowserAnimationsModule,
    ReactiveFormsModule,
    FormsModule,
    CommonModule,
    AirGapAngularCoreModule.forRoot({
      factories: {
        currencySymbolFacade: currencySymbolNgRxFacade,
        isolatedModulesDetailsFacade: isolatedModulesDetailsNgRxFacade,
        isolatedModulesListFacade: isolatedModulesListNgRxFacade,
        isolatedModulesListPageFacade: isolatedModulesListPageNgRxFacade
      }
    }),
    AirGapAngularNgRxModule,
    StoreModule.forRoot(ROOT_REDUCERS, {
      metaReducers,
      /* temporary fix for `ERROR TypeError: Cannot freeze array buffer views with elements` */
      runtimeChecks: {
        strictStateImmutability: false,
        strictActionImmutability: false
      }
    }),
    ZXingScannerModule,
    MomentModule,
    IonicModule.forRoot(),
    AppRoutingModule,
    HttpClientModule,
    TranslateModule.forRoot({
      loader: {
        provide: TranslateLoader,
        useFactory: createTranslateLoader,
        deps: [HttpClient]
      }
    }),
    IonicStorageModule.forRoot({
      name: '__airgap_storage',
      driverOrder: [CordovaSQLiteDriver._driver, Drivers.LocalStorage]
    }),
    PipesModule,
    ComponentsModule,
    ProtocolSelectPageModule,
    BeaconRequestPageModule,
    IntroductionPushPageModule,
    IsolatedModulesOnboardingPageModule
  ],
  providers: [
    { provide: APP_PLUGIN, useValue: App },
    { provide: APP_INFO_PLUGIN, useValue: AppInfo },
    { provide: APP_LAUNCHER_PLUGIN, useValue: AppLauncher },
    { provide: BROWSER_PLUGIN, useValue: Browser },
    { provide: CLIPBOARD_PLUGIN, useValue: Clipboard },
    { provide: FILESYSTEM_PLUGIN, useValue: Filesystem },
    { provide: PUSH_NOTIFICATIONS_PLUGIN, useValue: PushNotifications },
    { provide: SAPLING_PLUGIN, useValue: SaplingNative },
    { provide: SHARE_PLUGIN, useValue: Share },
    { provide: SPLASH_SCREEN_PLUGIN, useValue: SplashScreen },
    { provide: STATUS_BAR_PLUGIN, useValue: StatusBar },
    { provide: APP_CONFIG, useValue: appConfig },
    { provide: ISOLATED_MODULES_PLUGIN, useFactory: isolatedModules, deps: [Platform] },
    { provide: ZIP_PLUGIN, useValue: Zip },
    { provide: FILE_PICKER_PLUGIN, useValue: FilePicker },
    { provide: BaseModulesService, useClass: WalletModulesService },
    { provide: BaseEnvironmentService, useClass: WalletEnvironmentService },
    DecimalPipe,
    ShortenStringPipe,
    MarketDataService,
    { provide: RouteReuseStrategy, useClass: IonicRouteStrategy },
    QrScannerService,
    Diagnostic,
    AccountProvider,
    WalletStorageService,
    IACService,
    ClipboardService,
    PermissionsService,
    DeeplinkService,
    OperationsProvider,
    ExtensionsService,
    CoinlibService,
    PushProvider,
    PushBackendProvider,
    SaplingService,
    SerializerService,
    LedgerService,
    ProtocolGuard,
    ServiceKeyGuard,
    TransactionHashGuard,
    PercentPipe,
    FeeConverterPipe,
    InteractionService,
    ThemeService,
    NavigationService
  ],
  bootstrap: [AppComponent]
})
export class AppModule {}
