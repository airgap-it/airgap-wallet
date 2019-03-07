import { Component, ViewChild } from '@angular/core'
import { Deeplinks } from '@ionic-native/deeplinks'
import { SplashScreen } from '@ionic-native/splash-screen'
import { StatusBar } from '@ionic-native/status-bar'
import { TranslateService } from '@ngx-translate/core'
import { Platform, Nav } from 'ionic-angular'

import { TabsPage } from '../pages/tabs/tabs'

import { Storage } from '@ionic/storage'

import { AccountProvider } from '../providers/account/account.provider'
import { SchemeRoutingProvider } from '../providers/scheme-routing/scheme-routing'
import { setSentryRelease, handleErrorSentry, ErrorCategory } from '../providers/sentry-error-handler/sentry-error-handler'
import { ProtocolsProvider } from '../providers/protocols/protocols'
import { WebExtensionProvider } from '../providers/web-extension/web-extension'
import { AppInfoProvider } from '../providers/app-info/app-info'
import { SyncProtocolUtils, EncodedType } from 'airgap-coin-lib'
import { TransactionQrPage } from '../pages/transaction-qr/transaction-qr'

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
    private storage: Storage, // TODO remove
    private webExtensionProvider: WebExtensionProvider,
    private appInfoProvider: AppInfoProvider,
    private accountProvider: AccountProvider
  ) {
    this.initializeApp().catch(handleErrorSentry(ErrorCategory.OTHER))
  }

  async initializeApp() {
    const supportedLanguages = ['en', 'de', 'zh-cn']

    this.loadLanguages(supportedLanguages)
    this.protocolsProvider.addProtocols()

    await this.platform.ready()

    console.log(this.storage) // TODO: Remove

    if (this.platform.is('cordova')) {
      this.statusBar.styleDefault()
      this.statusBar.backgroundColorByHexString('#FFFFFF')
      this.splashScreen.hide()
      setSentryRelease('app_' + this.appInfoProvider.getVersionNumber())
    } else if (this.webExtensionProvider.isWebExtension()) {
      setSentryRelease('ext_' + this.appInfoProvider.getVersionNumber())
    } else {
      setSentryRelease('browser_' + this.appInfoProvider.getVersionNumber()) // TODO: Set version in CI once we have browser version
    }

    let url = new URL(location.href)

    if (url.searchParams.get('rawUnsignedTx')) {
      // Wait until wallets are initialized
      let sub = this.accountProvider.wallets.subscribe(wallets => {
        this.walletDeeplink()
        sub.unsubscribe()
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
    let url = new URL(location.href)
    let publicKey = url.searchParams.get('publicKey')
    let rawUnsignedTx = JSON.parse(url.searchParams.get('rawUnsignedTx'))
    let identifier = url.searchParams.get('identifier')
    console.log('publicKey', publicKey)
    console.log('rawUnsignedTx', rawUnsignedTx)
    console.log('identifier', identifier)

    let wallet = this.accountProvider.walletByPublicKeyAndProtocolAndAddressIndex(publicKey, identifier)
    const airGapTx = await wallet.coinProtocol.getTransactionDetails({
      publicKey: wallet.publicKey,
      transaction: rawUnsignedTx
    })

    const syncProtocol = new SyncProtocolUtils()
    const serializedTx = await syncProtocol.serialize({
      version: 1,
      protocol: wallet.coinProtocol.identifier,
      type: EncodedType.UNSIGNED_TRANSACTION,
      payload: {
        publicKey: wallet.publicKey,
        transaction: rawUnsignedTx,
        callback: 'airgap-wallet://?d='
      }
    })

    this.nav.push(TransactionQrPage, {
      wallet: wallet,
      airGapTx: airGapTx,
      data: 'airgap-vault://?d=' + serializedTx
    })
  }
}
