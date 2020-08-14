import { AirGapAngularCoreModule, AirGapTranslateLoader } from '@airgap/angular-core'
import { CommonModule, DecimalPipe } from '@angular/common'
import { HttpClient, HttpClientModule } from '@angular/common/http'
import { NgModule } from '@angular/core'
import { FormsModule, ReactiveFormsModule } from '@angular/forms'
import { BrowserModule } from '@angular/platform-browser'
import { BrowserAnimationsModule } from '@angular/platform-browser/animations'
import { RouteReuseStrategy } from '@angular/router'
import { Plugins } from '@capacitor/core'
import { BarcodeScanner } from '@ionic-native/barcode-scanner/ngx'
import { Diagnostic } from '@ionic-native/diagnostic/ngx'
import { Keyboard } from '@ionic-native/keyboard/ngx'
import { QRScanner } from '@ionic-native/qr-scanner/ngx'
import { IonicModule, IonicRouteStrategy } from '@ionic/angular'
import { IonicStorageModule } from '@ionic/storage'
import { TranslateLoader, TranslateModule } from '@ngx-translate/core'
import { ZXingScannerModule } from '@zxing/ngx-scanner'
import { ChartsModule } from 'ng2-charts'
import { LottieModule } from 'ngx-lottie'
import { MomentModule } from 'ngx-moment'

import { AppRoutingModule } from './app-routing.module'
import { AppComponent } from './app.component'
import {
  APP_INFO_PLUGIN,
  APP_PLUGIN,
  BROWSER_PLUGIN,
  CLIPBOARD_PLUGIN,
  PERMISSIONS_PLUGIN,
  PUSH_NOTIFICATIONS_PLUGIN,
  SHARE_PLUGIN,
  SPLASH_SCREEN_PLUGIN,
  STATUS_BAR_PLUGIN
} from './capacitor-plugins/injection-tokens'
import { ComponentsModule } from './components/components.module'
import { BeaconRequestPageModule } from './pages/beacon-request/beacon-request.module'
import { BeaconRequestPage } from './pages/beacon-request/beacon-request.page'
import { ExchangeSelectPageModule } from './pages/exchange-select/exchange-select.module'
import { ExchangeSelectPage } from './pages/exchange-select/exchange-select.page'
import { IntroductionPushPage } from './pages/introduction-push/introduction-push'
import { IntroductionPushPageModule } from './pages/introduction-push/introduction-push.module'
import { ProtocolSelectPage } from './pages/protocol-select/protocol-select'
import { ProtocolSelectPageModule } from './pages/protocol-select/protocol-select.module'
import { PipesModule } from './pipes/pipes.module'
import { ShortenStringPipe } from './pipes/shorten-string/shorten-string.pipe'
import { AccountProvider } from './services/account/account.provider'
import { AppInfoProvider } from './services/app-info/app-info'
import { ClipboardService } from './services/clipboard/clipboard'
import { DeepLinkProvider } from './services/deep-link/deep-link'
import { DrawChartService } from './services/draw-chart/draw-chart.service'
import { ExchangeProvider } from './services/exchange/exchange'
import { ExtensionsService } from './services/extensions/extensions.service'
import { MarketDataService } from './services/market-data/market-data.service'
import { OperationsProvider } from './services/operations/operations'
import { PermissionsProvider } from './services/permissions/permissions'
import { PushBackendProvider } from './services/push-backend/push-backend'
import { PushProvider } from './services/push/push'
import { RemoteConfigProvider } from './services/remote-config/remote-config'
import { ScannerProvider } from './services/scanner/scanner'
import { SchemeRoutingProvider } from './services/scheme-routing/scheme-routing'
import { SerializerService } from './services/serializer/serializer.service'
import { StorageProvider } from './services/storage/storage'

export function createTranslateLoader(http: HttpClient): AirGapTranslateLoader {
  return new AirGapTranslateLoader(http, { prefix: './assets/i18n/', suffix: '.json' })
}

export async function createPlayer() {
  return import('lottie-web')
}

@NgModule({
  declarations: [AppComponent],
  entryComponents: [ProtocolSelectPage, IntroductionPushPage, BeaconRequestPage, ExchangeSelectPage],
  exports: [],
  imports: [
    BrowserModule,
    ChartsModule,
    BrowserAnimationsModule,
    ReactiveFormsModule,
    FormsModule,
    CommonModule,
    AirGapAngularCoreModule,
    ZXingScannerModule,
    MomentModule,
    LottieModule.forRoot({ player: createPlayer }),
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
      driverOrder: ['sqlite', 'localstorage']
    }),
    PipesModule,
    ComponentsModule,
    ProtocolSelectPageModule,
    BeaconRequestPageModule,
    ExchangeSelectPageModule,
    IntroductionPushPageModule
  ],
  providers: [
    { provide: APP_PLUGIN, useValue: Plugins.App },
    { provide: APP_INFO_PLUGIN, useValue: Plugins.AppInfo },
    { provide: BROWSER_PLUGIN, useValue: Plugins.Browser },
    { provide: CLIPBOARD_PLUGIN, useValue: Plugins.Clipboard },
    { provide: PERMISSIONS_PLUGIN, useValue: Plugins.Permissions },
    { provide: PUSH_NOTIFICATIONS_PLUGIN, useValue: Plugins.PushNotifications },
    { provide: SHARE_PLUGIN, useValue: Plugins.Share },
    { provide: SPLASH_SCREEN_PLUGIN, useValue: Plugins.SplashScreen },
    { provide: STATUS_BAR_PLUGIN, useValue: Plugins.StatusBar },
    BarcodeScanner,
    QRScanner,
    Keyboard,
    DecimalPipe,
    ShortenStringPipe,
    MarketDataService,
    DrawChartService,
    { provide: RouteReuseStrategy, useClass: IonicRouteStrategy },
    ScannerProvider,
    Diagnostic,
    AccountProvider,
    StorageProvider,
    SchemeRoutingProvider,
    ClipboardService,
    PermissionsProvider,
    DeepLinkProvider,
    OperationsProvider,
    ExtensionsService,
    ExchangeProvider,
    RemoteConfigProvider,
    AppInfoProvider,
    PushProvider,
    PushBackendProvider,
    SerializerService
  ],
  bootstrap: [AppComponent]
})
export class AppModule {}
