import { DisclaimerWebExtensionPage } from './pages/disclaimer-web-extension/disclaimer-web-extension'
import { NgModule } from '@angular/core'
import { BrowserModule } from '@angular/platform-browser'
import { BrowserAnimationsModule } from '@angular/platform-browser/animations'
import { RouteReuseStrategy } from '@angular/router'
import { ReactiveFormsModule, FormsModule } from '@angular/forms'
import { CommonModule } from '@angular/common'

import { IonicModule, IonicRouteStrategy } from '@ionic/angular'
import { SplashScreen } from '@ionic-native/splash-screen/ngx'
import { StatusBar } from '@ionic-native/status-bar/ngx'
import { Push } from '@ionic-native/push/ngx'
import { HttpClient, HttpClientModule } from '@angular/common/http'
import { ErrorHandler } from '@angular/core'
import { AppVersion } from '@ionic-native/app-version/ngx'
import { BarcodeScanner } from '@ionic-native/barcode-scanner/ngx'
import { QRScanner, QRScannerStatus } from '@ionic-native/qr-scanner/ngx'
import { Deeplinks } from '@ionic-native/deeplinks/ngx'
import { Keyboard } from '@ionic-native/keyboard/ngx'
import { Clipboard } from '@ionic-native/clipboard/ngx'
import { Diagnostic } from '@ionic-native/diagnostic/ngx'

import { TranslateLoader, TranslateModule } from '@ngx-translate/core'
import { TranslateHttpLoader } from '@ngx-translate/http-loader'
import { MaterialIconsModule } from 'ionic2-material-icons'
import { IonicStorageModule } from '@ionic/storage'
import { MomentModule } from 'ngx-moment'
import { ZXingScannerModule } from '@zxing/ngx-scanner'

import { AppRoutingModule } from './app-routing.module'
import { PipesModule } from './pipes/pipes.module'
import { ComponentsModule } from './components/components.module'
import { LottieAnimationViewModule } from 'ng-lottie'

import { SchemeRoutingProvider } from './services/scheme-routing/scheme-routing'
import { ScannerProvider } from './services/scanner/scanner'
import { AccountProvider } from './services/account/account.provider'
import { StorageProvider } from './services/storage/storage'
import { SentryErrorHandler } from './services/sentry-error-handler/sentry-error-handler'
import { ClipboardProvider } from './services/clipboard/clipboard'
import { PermissionsProvider } from './services/permissions/permissions'
import { ProtocolsProvider } from './services/protocols/protocols'
import { DeepLinkProvider } from './services/deep-link/deep-link'
import { OperationsProvider } from './services/operations/operations'
import { ExchangeProvider } from './services/exchange/exchange'
import { RemoteConfigProvider } from './services/remote-config/remote-config'
import { WebExtensionProvider } from './services/web-extension/web-extension'
import { AppInfoProvider } from './services/app-info/app-info'
import { PushProvider } from './services/push/push'
import { PushBackendProvider } from './services/push-backend/push-backend'

import { AppComponent } from './app.component'
import { ProtocolSelectPage } from './pages/protocol-select/protocol-select'
import { ProtocolSelectPageModule } from './pages/protocol-select/protocol-select.module'

export function createTranslateLoader(http: HttpClient) {
  return new TranslateHttpLoader(http, './assets/i18n/', '.json')
}

@NgModule({
  declarations: [AppComponent],
  entryComponents: [ProtocolSelectPage],
  exports: [],
  imports: [
    BrowserModule,
    BrowserAnimationsModule,
    ReactiveFormsModule,
    FormsModule,
    CommonModule,
    ZXingScannerModule,
    HttpClientModule,
    MaterialIconsModule,
    MomentModule,
    LottieAnimationViewModule,
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
      driverOrder: ['sqlite', 'webExtensionLocalStorage', 'localstorage']
    }),
    PipesModule,
    ComponentsModule,
    ProtocolSelectPageModule
  ],
  providers: [
    StatusBar,
    SplashScreen,
    BarcodeScanner,
    QRScanner,
    Keyboard,
    Deeplinks,
    Clipboard,
    { provide: RouteReuseStrategy, useClass: IonicRouteStrategy },
    ScannerProvider,
    AppVersion,
    Diagnostic,
    AccountProvider,
    StorageProvider,
    SchemeRoutingProvider,
    ClipboardProvider,
    PermissionsProvider,
    ProtocolsProvider,
    DeepLinkProvider,
    OperationsProvider,
    ExchangeProvider,
    RemoteConfigProvider,
    WebExtensionProvider,
    AppInfoProvider,
    PushProvider,
    Push,
    PushBackendProvider
  ],
  bootstrap: [AppComponent]
})
export class AppModule {}
