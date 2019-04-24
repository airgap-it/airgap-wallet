import { ExtensionSharePermissionPage } from './../pages/extension-share-permission/extension-share-permission'
import { DeepLinkProvider } from './../providers/deep-link/deep-link'
import { PushProvider } from '../providers/push/push'

import { Component, ViewChild } from '@angular/core'
import { Deeplinks } from '@ionic-native/deeplinks'
import { SplashScreen } from '@ionic-native/splash-screen'
import { StatusBar } from '@ionic-native/status-bar'
import { TranslateService } from '@ngx-translate/core'
import { Platform, Nav } from 'ionic-angular'
import { TabsPage } from '../pages/tabs/tabs'
import { AccountProvider } from '../providers/account/account.provider'
import { SchemeRoutingProvider } from '../providers/scheme-routing/scheme-routing'
import { setSentryRelease, handleErrorSentry, ErrorCategory, setSentryUser } from '../providers/sentry-error-handler/sentry-error-handler'
import { ProtocolsProvider } from '../providers/protocols/protocols'
import { WebExtensionProvider } from '../providers/web-extension/web-extension'
import { AppInfoProvider } from '../providers/app-info/app-info'
import { TransactionQrPage } from '../pages/transaction-qr/transaction-qr'
import { StorageProvider, SettingsKey } from '../providers/storage/storage'
import { generateGUID } from '../utils/utils'

@Component({
  templateUrl: 'app.html'
})
export class MyApp {
  @ViewChild(Nav)
  nav: Nav

  rootPage: any = TabsPage

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
    private pushProvider: PushProvider
  ) {
    this.initializeApp().catch(handleErrorSentry(ErrorCategory.OTHER))
  }

  async initializeApp() {
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
    console.log('URL in app.component.ts', url)

    if (url.searchParams.get('rawUnsignedTx')) {
      // Wait until wallets are initialized
      let sub = this.accountProvider.wallets.subscribe(wallets => {
        this.walletDeeplink()
        if (sub) {
          sub.unsubscribe()
        }
      })
    } else if (url.searchParams.get('sdkId')) {
      this.nav.push(ExtensionSharePermissionPage, {
        sdkId: url.searchParams.get('sdkId'),
        address: url.searchParams.get('address'),
        providerId: url.searchParams.get('providerId')
      })
    }
  }

  loadLanguages(supportedLanguages: string[]) {
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

  async ngAfterViewInit() {
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
              .handleNewSyncRequest(this.nav, match.$link.url)
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
  async walletDeeplink() {
    let deeplinkInfo = await this.deepLinkProvider.walletDeepLink()
    this.nav.push(TransactionQrPage, {
      wallet: deeplinkInfo.wallet,
      airGapTx: deeplinkInfo.airGapTx,
      data: 'airgap-vault://?d=' + deeplinkInfo.serializedTx
    })
  }
}
