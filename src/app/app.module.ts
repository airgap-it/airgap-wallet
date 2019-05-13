import { CommonModule } from '@angular/common'
import { HttpClient, HttpClientModule } from '@angular/common/http'
import { NgModule } from '@angular/core'
import { FormsModule, ReactiveFormsModule } from '@angular/forms'
import { BrowserModule } from '@angular/platform-browser'
import { BrowserAnimationsModule } from '@angular/platform-browser/animations'
import { RouteReuseStrategy } from '@angular/router'
import { AppVersion } from '@ionic-native/app-version/ngx'
import { BarcodeScanner } from '@ionic-native/barcode-scanner/ngx'
import { Clipboard } from '@ionic-native/clipboard/ngx'
import { Deeplinks } from '@ionic-native/deeplinks/ngx'
import { Diagnostic } from '@ionic-native/diagnostic/ngx'
import { Keyboard } from '@ionic-native/keyboard/ngx'
import { Push } from '@ionic-native/push/ngx'
import { QRScanner } from '@ionic-native/qr-scanner/ngx'
import { SplashScreen } from '@ionic-native/splash-screen/ngx'
import { StatusBar } from '@ionic-native/status-bar/ngx'
import { IonicModule, IonicRouteStrategy } from '@ionic/angular'
import { IonicStorageModule } from '@ionic/storage'
import { TranslateLoader, TranslateModule } from '@ngx-translate/core'
import { TranslateHttpLoader } from '@ngx-translate/http-loader'
import { ZXingScannerModule } from '@zxing/ngx-scanner'
import { MaterialIconsModule } from 'ionic2-material-icons'
import { LottieAnimationViewModule } from 'ng-lottie'
import { MomentModule } from 'ngx-moment'

import { AppRoutingModule } from './app-routing.module'
import { AppComponent } from './app.component'
import { ComponentsModule } from './components/components.module'
import { ProtocolSelectPage } from './pages/protocol-select/protocol-select'
import { ProtocolSelectPageModule } from './pages/protocol-select/protocol-select.module'
import { PipesModule } from './pipes/pipes.module'
import { AccountProvider } from './services/account/account.provider'
import { AppInfoProvider } from './services/app-info/app-info'
import { ClipboardProvider } from './services/clipboard/clipboard'
import { DeepLinkProvider } from './services/deep-link/deep-link'
import { ExchangeProvider } from './services/exchange/exchange'
import { OperationsProvider } from './services/operations/operations'
import { PermissionsProvider } from './services/permissions/permissions'
import { ProtocolsProvider } from './services/protocols/protocols'
import { PushBackendProvider } from './services/push-backend/push-backend'
import { PushProvider } from './services/push/push'
import { RemoteConfigProvider } from './services/remote-config/remote-config'
import { ScannerProvider } from './services/scanner/scanner'
import { SchemeRoutingProvider } from './services/scheme-routing/scheme-routing'
import { StorageProvider } from './services/storage/storage'
import { WebExtensionProvider } from './services/web-extension/web-extension'

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
