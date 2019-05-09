import { Component, ViewChild } from '@angular/core'
import { Router } from '@angular/router'
import { Deeplinks } from '@ionic-native/deeplinks/ngx'
import { SplashScreen } from '@ionic-native/splash-screen/ngx'
import { StatusBar } from '@ionic-native/status-bar/ngx'
import { Platform } from '@ionic/angular'
import { TranslateService } from '@ngx-translate/core'

import { AccountProvider } from './services/account/account.provider'
import { AppInfoProvider } from './services/app-info/app-info'
import { DataService, DataServiceKey } from './services/data/data.service'
import { DeepLinkProvider } from './services/deep-link/deep-link'
import { ProtocolsProvider } from './services/protocols/protocols'
import { PushProvider } from './services/push/push'
import { SchemeRoutingProvider } from './services/scheme-routing/scheme-routing'
import { ErrorCategory, handleErrorSentry, setSentryRelease, setSentryUser } from './services/sentry-error-handler/sentry-error-handler'
// import { TransactionQrPage } from '../pages/transaction-qr/transaction-qr'
import { SettingsKey, StorageProvider } from './services/storage/storage'
import { WebExtensionProvider } from './services/web-extension/web-extension'
import { generateGUID } from './utils/utils'

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html'
})
export class AppComponent {
  constructor(
    private platform: Platform,
    private statusBar: StatusBar,
    private splashScreen: SplashScreen,
    private translate: TranslateService,
    private deeplinks: Deeplinks,
    private schemeRoutingProvider: SchemeRoutingProvider,
    private protocolsProvider: ProtocolsProvider,
    private storageProvider: StorageProvider,
    private webExtensionProvider: WebExtensionProvider,
    private appInfoProvider: AppInfoProvider,
    private accountProvider: AccountProvider,
    private deepLinkProvider: DeepLinkProvider,
    private pushProvider: PushProvider,
    private router: Router,
    private dataService: DataService
  ) {
    this.initializeApp().catch(handleErrorSentry(ErrorCategory.OTHER))
  }

  public async initializeApp() {
    const supportedLanguages = ['en', 'de', 'zh-cn']

    this.loadLanguages(supportedLanguages)
    this.protocolsProvider.addProtocols()

    await this.platform.ready()

    if (this.platform.is('cordova')) {
      this.statusBar.styleDefault()
      this.statusBar.backgroundColorByHexString('#FFFFFF')
      this.splashScreen.hide()

      this.pushProvider.initPush()
    }

    this.appInfoProvider
      .getVersionNumber()
      .then(version => {
        if (this.platform.is('cordova')) {
          setSentryRelease('app_' + version)
        } else if (this.webExtensionProvider.isWebExtension()) {
          setSentryRelease('ext_' + version)
        } else {
          setSentryRelease('browser_' + version) // TODO: Set version in CI once we have browser version
        }
      })
      .catch(handleErrorSentry(ErrorCategory.CORDOVA_PLUGIN))

    let userId = await this.storageProvider.get(SettingsKey.USER_ID)
    if (!userId) {
      userId = generateGUID()
      this.storageProvider.set(SettingsKey.USER_ID, userId).catch(handleErrorSentry(ErrorCategory.STORAGE))
    }
    setSentryUser(userId)

    let url = new URL(location.href)

    if (url.searchParams.get('rawUnsignedTx')) {
      // Wait until wallets are initialized
      let sub = this.accountProvider.wallets.subscribe(wallets => {
        this.walletDeeplink()
        if (sub) {
          sub.unsubscribe()
        }
      })
    }
  }

  public loadLanguages(supportedLanguages: string[]) {
    this.translate.setDefaultLang('en')

    const language = this.translate.getBrowserLang()

    if (language) {
      const lowerCaseLanguage = language.toLowerCase()
      supportedLanguages.forEach(supportedLanguage => {
        if (supportedLanguage.startsWith(lowerCaseLanguage)) {
          this.translate.use(supportedLanguage)
        }
      })
    }
  }

  public async ngAfterViewInit() {
    await this.platform.ready()
    if (this.platform.is('cordova')) {
      this.deeplinks
        .route({
          '/': null
        })
        .subscribe(
          match => {
            // match.$route - the route we matched, which is the matched entry from the arguments to route()
            // match.$args - the args passed in the link
            // match.$link - the full link data
            console.log('Successfully matched route', JSON.stringify(match))
            this.schemeRoutingProvider
              .handleNewSyncRequest(this.router, match.$link.url)
              .catch(handleErrorSentry(ErrorCategory.SCHEME_ROUTING))
          },
          nomatch => {
            // nomatch.$link - the full link data
            handleErrorSentry(ErrorCategory.DEEPLINK_PROVIDER)('route not matched: ' + JSON.stringify(nomatch))
          }
        )
    }
  }

  // TODO: Move to provider
  public async walletDeeplink() {
    let deeplinkInfo = await this.deepLinkProvider.walletDeepLink()
    const info = {
      wallet: deeplinkInfo.wallet,
      airGapTx: deeplinkInfo.airGapTx,
      data: 'airgap-vault://?d=' + deeplinkInfo.serializedTx
    }
    this.dataService.setData(DataServiceKey.TRANSACTION, info)
    this.router.navigateByUrl('/transaction-qr/' + DataServiceKey.TRANSACTION).catch(handleErrorSentry(ErrorCategory.NAVIGATION))
  }
}
