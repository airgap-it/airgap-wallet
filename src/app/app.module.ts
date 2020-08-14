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
import { TranslateHttpLoader } from '@ngx-translate/http-loader'
import { ZXingScannerModule } from '@zxing/ngx-scanner'
import { ChartsModule } from 'ng2-charts'
import { MomentModule } from 'ngx-moment'
import { ExchangeSelectPageModule } from './pages/exchange-select/exchange-select.module'
import { ExchangeSelectPage } from './pages/exchange-select/exchange-select.page'

import { AppRoutingModule } from './app-routing.module'
import { AppComponent } from './app.component'
import { ComponentsModule } from './components/components.module'
import { IntroductionPushPage } from './pages/introduction-push/introduction-push'
import { IntroductionPushPageModule } from './pages/introduction-push/introduction-push.module'
import { ProtocolSelectPage } from './pages/protocol-select/protocol-select'
import { ProtocolSelectPageModule } from './pages/protocol-select/protocol-select.module'
import { AmountConverterPipe } from './pipes/amount-converter/amount-converter.pipe'
import { PipesModule } from './pipes/pipes.module'
import { AccountProvider } from './services/account/account.provider'
import { AppInfoProvider } from './services/app-info/app-info'
import { ClipboardService } from './services/clipboard/clipboard'
import { DeepLinkProvider } from './services/deep-link/deep-link'
import { DrawChartService } from './services/draw-chart/draw-chart.service'
import { ExchangeProvider } from './services/exchange/exchange'
import { MarketDataService } from './services/market-data/market-data.service'
import { OperationsProvider } from './services/operations/operations'
import { PermissionsProvider } from './services/permissions/permissions'

import { BeaconRequestPageModule } from './pages/beacon-request/beacon-request.module'
import { BeaconRequestPage } from './pages/beacon-request/beacon-request.page'
import { ShortenStringPipe } from './pipes/shorten-string/shorten-string.pipe'
import { ExtensionsService } from './services/extensions/extensions.service'
import { PushBackendProvider } from './services/push-backend/push-backend'
import { PushProvider } from './services/push/push'
import { RemoteConfigProvider } from './services/remote-config/remote-config'
import { ScannerProvider } from './services/scanner/scanner'
import { SchemeRoutingProvider } from './services/scheme-routing/scheme-routing'
import { SerializerService } from './services/serializer/serializer.service'
import { StorageProvider } from './services/storage/storage'

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
import { ProtocolsProvider } from './services/protocols/protocols'

const { App, AppInfo, Browser, Clipboard, Permissions, PushNotifications, Share, SplashScreen, StatusBar } = Plugins

export function createTranslateLoader(http: HttpClient): TranslateHttpLoader {
  return new TranslateHttpLoader(http, './assets/i18n/', '.json')
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
    ZXingScannerModule,
    HttpClientModule,

    MomentModule,
    IonicModule.forRoot(),
    AppRoutingModule,
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
    { provide: APP_PLUGIN, useValue: App },
    { provide: APP_INFO_PLUGIN, useValue: AppInfo },
    { provide: BROWSER_PLUGIN, useValue: Browser },
    { provide: CLIPBOARD_PLUGIN, useValue: Clipboard },
    { provide: PERMISSIONS_PLUGIN, useValue: Permissions },
    { provide: PUSH_NOTIFICATIONS_PLUGIN, useValue: PushNotifications },
    { provide: SHARE_PLUGIN, useValue: Share },
    { provide: SPLASH_SCREEN_PLUGIN, useValue: SplashScreen },
    { provide: STATUS_BAR_PLUGIN, useValue: StatusBar },
    BarcodeScanner,
    QRScanner,
    Keyboard,
    AmountConverterPipe,
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
    ProtocolsProvider,
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
