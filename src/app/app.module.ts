import { HttpClient, HttpClientModule } from '@angular/common/http'
import { ErrorHandler, NgModule } from '@angular/core'
import { BrowserModule } from '@angular/platform-browser'
import { BrowserAnimationsModule } from '@angular/platform-browser/animations'
import { AppVersion } from '@ionic-native/app-version'
import { BarcodeScanner } from '@ionic-native/barcode-scanner'
import { Deeplinks } from '@ionic-native/deeplinks'
import { Keyboard } from '@ionic-native/keyboard'
import { SplashScreen } from '@ionic-native/splash-screen'
import { StatusBar } from '@ionic-native/status-bar'
import { TranslateLoader, TranslateModule } from '@ngx-translate/core'
import { TranslateHttpLoader } from '@ngx-translate/http-loader'
import { QRCodeModule } from 'angularx-qrcode'
import { IonicApp, IonicErrorHandler, IonicModule } from 'ionic-angular'
import { MaterialIconsModule } from 'ionic2-material-icons'

import { ComponentsModule } from '../components/components.module'
import { AboutPage } from '../pages/about/about'
import { CoinInfoPage } from '../pages/coin-info/coin-info'
import { IntroductionPage } from '../pages/introduction/introduction'
import { PortfolioPage } from '../pages/portfolio/portfolio'
import { ScanAddressPage } from '../pages/scan-address/scan-address'
import { ScanSyncPage } from '../pages/scan-sync/scan-sync'
import { ScanPage } from '../pages/scan/scan'
import { SettingsPage } from '../pages/settings/settings'
import { TabsPage } from '../pages/tabs/tabs'
import { TransactionConfirmPage } from '../pages/transaction-confirm/transaction-confirm'
import { TransactionDetailPage } from '../pages/transaction-detail/transaction-detail'
import { TransactionPreparePage } from '../pages/transaction-prepare/transaction-prepare'
import { TransactionQrPage } from '../pages/transaction-qr/transaction-qr'
import { WalletAddressPage } from '../pages/wallet-address/wallet-address'
import { WalletImportPage } from '../pages/wallet-import/wallet-import'
import { IntroductionDownloadPage } from '../pages/introduction-download/introduction-download'
import { PipesModule } from '../pipes/pipes.module'
import { QrProvider } from '../providers/qr/qr'
import { ScannerProvider } from '../providers/scanner/scanner'
import { WalletsProvider } from '../providers/wallets/wallets.provider'
import { MomentModule } from 'ngx-moment'
import { ZXingScannerModule } from '@zxing/ngx-scanner'

import { MyApp } from './app.component'
import { IonicStorageModule } from '@ionic/storage'
import { WalletEditPopoverComponent } from '../components/wallet-edit-popover/wallet-edit-popover.component'
import { SettingsProvider } from '../providers/settings/settings'

export function createTranslateLoader(http: HttpClient) {
  return new TranslateHttpLoader(http, './assets/i18n/', '.json')
}

@NgModule({
  declarations: [
    MyApp,
    CoinInfoPage,
    PortfolioPage,
    TransactionPreparePage,
    IntroductionPage,
    SettingsPage,
    ScanPage,
    TabsPage,
    AboutPage,
    WalletAddressPage,
    TransactionConfirmPage,
    TransactionDetailPage,
    TransactionQrPage,
    ScanAddressPage,
    ScanSyncPage,
    WalletImportPage,
    IntroductionDownloadPage
  ],
  imports: [
    BrowserModule,
    ZXingScannerModule,
    HttpClientModule,
    MaterialIconsModule,
    MomentModule,
    TranslateModule.forRoot({
      loader: {
        provide: TranslateLoader,
        useFactory: createTranslateLoader,
        deps: [HttpClient]
      }
    }),
    QRCodeModule,
    BrowserAnimationsModule,
    IonicModule.forRoot(MyApp, {
      tabsHideOnSubPages: true
    }),
    IonicStorageModule.forRoot({
      name: '__airgap_storage',
      driverOrder: ['sqlite', 'localstorage']
    }),
    ComponentsModule,
    PipesModule
  ],
  bootstrap: [IonicApp],
  entryComponents: [
    MyApp,
    CoinInfoPage,
    PortfolioPage,
    TransactionPreparePage,
    SettingsPage,
    ScanPage,
    IntroductionPage,
    TabsPage,
    AboutPage,
    WalletAddressPage,
    TransactionConfirmPage,
    TransactionDetailPage,
    TransactionQrPage,
    ScanAddressPage,
    ScanSyncPage,
    WalletImportPage,
    WalletEditPopoverComponent,
    IntroductionDownloadPage
  ],
  providers: [
    StatusBar,
    SplashScreen,
    BarcodeScanner,
    Keyboard,
    Deeplinks,
    { provide: ErrorHandler, useClass: IonicErrorHandler },
    ScannerProvider,
    AppVersion,
    WalletsProvider,
    QrProvider,
    SettingsProvider
  ]
})
export class AppModule {}
