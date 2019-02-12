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
import { IonicApp, IonicModule, Platform } from 'ionic-angular'
import { MaterialIconsModule } from 'ionic2-material-icons'

import { ComponentsModule } from '../components/components.module'
import { AboutPage } from '../pages/about/about'
import { AccountTransactionListPage } from '../pages/account-transaction-list/account-transaction-list'
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
import { AccountAddressPage } from '../pages/account-address/account-address'
import { AccountImportPage } from '../pages/account-import/account-import'
import { IntroductionDownloadPage } from '../pages/introduction-download/introduction-download'
import { PipesModule } from '../pipes/pipes.module'
import { ScannerProvider } from '../providers/scanner/scanner'
import { AccountProvider } from '../providers/account/account.provider'
import { MomentModule } from 'ngx-moment'
import { ZXingScannerModule } from '@zxing/ngx-scanner'
import { SchemeRoutingProvider } from '../providers/scheme-routing/scheme-routing'

import { MyApp } from './app.component'
import { IonicStorageModule } from '@ionic/storage'
import { AccountEditPopoverComponent } from '../components/account-edit-popover/account-edit-popover.component'
import { StorageProvider } from '../providers/storage/storage'
import { Clipboard } from '@ionic-native/clipboard'
import { Diagnostic } from '@ionic-native/diagnostic'
import { SentryErrorHandler } from '../providers/sentry-error-handler/sentry-error-handler'
import { ClipboardBrowserProvider } from '../providers/clipboard-browser/clipboard-browser'
import { PermissionsProvider } from '../providers/permissions/permissions'
import { LottieAnimationViewModule } from 'ng-lottie'
import { SupportedSubAccountsProvider } from '../providers/supported-sub-accounts/supported-sub-accounts'
import { AddAccountPage } from '../pages/add-account/add-account'
import { AddSubAccountPage } from '../pages/add-sub-account/add-sub-account'
import { SubAccountImportPage } from '../pages/sub-account-import/sub-account-import'
import { AccountImportOnboardingPage } from '../pages/account-import-onboarding/account-import-onboarding'
import { SubAccountProvider } from '../providers/account/sub-account.provider'
import { AccountDetailPage } from '../pages/account-detail/account-detail'
import { DeepLinkProvider } from '../providers/deep-link/deep-link'
import { InteractionSelectionPage } from '../pages/interaction-selection/interaction-selection'

export function createTranslateLoader(http: HttpClient) {
  return new TranslateHttpLoader(http, './assets/i18n/', '.json')
}

@NgModule({
  declarations: [
    MyApp,
    AccountTransactionListPage,
    PortfolioPage,
    TransactionPreparePage,
    IntroductionPage,
    SettingsPage,
    ScanPage,
    TabsPage,
    AboutPage,
    AccountAddressPage,
    TransactionConfirmPage,
    TransactionDetailPage,
    TransactionQrPage,
    ScanAddressPage,
    ScanSyncPage,
    AccountImportPage,
    IntroductionDownloadPage,
    AddAccountPage,
    AddSubAccountPage,
    SubAccountImportPage,
    AccountImportOnboardingPage,
    AccountDetailPage,
    InteractionSelectionPage
  ],
  imports: [
    BrowserModule,
    ZXingScannerModule,
    HttpClientModule,
    MaterialIconsModule,
    MomentModule,
    LottieAnimationViewModule,
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
    AccountTransactionListPage,
    PortfolioPage,
    TransactionPreparePage,
    SettingsPage,
    ScanPage,
    IntroductionPage,
    TabsPage,
    AboutPage,
    AccountAddressPage,
    TransactionConfirmPage,
    TransactionDetailPage,
    TransactionQrPage,
    ScanAddressPage,
    ScanSyncPage,
    AccountImportPage,
    AccountEditPopoverComponent,
    IntroductionDownloadPage,
    AddAccountPage,
    AddSubAccountPage,
    SubAccountImportPage,
    AccountImportOnboardingPage,
    AccountDetailPage,
    InteractionSelectionPage
  ],
  providers: [
    StatusBar,
    SplashScreen,
    BarcodeScanner,
    Keyboard,
    Deeplinks,
    { provide: ErrorHandler, useClass: SentryErrorHandler },
    ScannerProvider,
    AppVersion,
    Diagnostic,
    AccountProvider,
    StorageProvider,
    {
      provide: Clipboard,
      useFactory: (platform: Platform) => (platform.is('cordova') ? new Clipboard() : new ClipboardBrowserProvider()),
      deps: [Platform]
    },
    SchemeRoutingProvider,
    ClipboardBrowserProvider,
    PermissionsProvider,
    SupportedSubAccountsProvider,
    SubAccountProvider,
    DeepLinkProvider
  ]
})
export class AppModule {}
