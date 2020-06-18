import { Component, Inject, NgZone } from '@angular/core'
import { Router } from '@angular/router'
import { AppPlugin, AppUrlOpen, SplashScreenPlugin, StatusBarPlugin, StatusBarStyle } from '@capacitor/core'
import { Config, Platform } from '@ionic/angular'
import { TranslateService } from '@ngx-translate/core'

import { APP_PLUGIN, SPLASH_SCREEN_PLUGIN, STATUS_BAR_PLUGIN } from './capacitor-plugins/injection-tokens'
import { AccountProvider } from './services/account/account.provider'
import { AppInfoProvider } from './services/app-info/app-info'
import { DataService, DataServiceKey } from './services/data/data.service'
import { DeepLinkProvider } from './services/deep-link/deep-link'
import { ProtocolsProvider } from './services/protocols/protocols'
import { PushProvider } from './services/push/push'
import { SchemeRoutingProvider } from './services/scheme-routing/scheme-routing'
import { ErrorCategory, handleErrorSentry, setSentryRelease, setSentryUser } from './services/sentry-error-handler/sentry-error-handler'
import { SettingsKey, StorageProvider } from './services/storage/storage'
import { WebExtensionProvider } from './services/web-extension/web-extension'
import { generateGUID } from './utils/utils'

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html'
})
export class AppComponent {
  public isMobile: boolean = false

  constructor(
    private readonly platform: Platform,
    private readonly translate: TranslateService,
    private readonly schemeRoutingProvider: SchemeRoutingProvider,
    private readonly protocolsProvider: ProtocolsProvider,
    private readonly storageProvider: StorageProvider,
    private readonly webExtensionProvider: WebExtensionProvider,
    private readonly appInfoProvider: AppInfoProvider,
    private readonly accountProvider: AccountProvider,
    private readonly deepLinkProvider: DeepLinkProvider,
    private readonly pushProvider: PushProvider,
    private readonly router: Router,
    private readonly dataService: DataService,
    private readonly config: Config,
    private readonly ngZone: NgZone,
    @Inject(APP_PLUGIN) private readonly app: AppPlugin,
    @Inject(SPLASH_SCREEN_PLUGIN) private readonly splashScreen: SplashScreenPlugin,
    @Inject(STATUS_BAR_PLUGIN) private readonly statusBar: StatusBarPlugin
  ) {
    this.initializeApp().catch(handleErrorSentry(ErrorCategory.OTHER))
    this.isMobile = this.platform.is('mobile')
  }

  public async initializeApp() {
    const supportedLanguages = ['en', 'de', 'zh-cn']

    this.loadLanguages(supportedLanguages)
    this.protocolsProvider.addProtocols()

    await this.platform.ready()

    if (this.platform.is('hybrid')) {
      this.statusBar.setStyle({ style: StatusBarStyle.Light })
      this.statusBar.setBackgroundColor({ color: '#FFFFFF' })
      this.splashScreen.hide()

      this.pushProvider.initPush()
    }

    this.appInfoProvider
      .getVersionNumber()
      .then(version => {
        if (this.platform.is('hybrid')) {
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

    const url = new URL(location.href)

    if (url.searchParams.get('rawUnsignedTx')) {
      // Wait until wallets are initialized
      // TODO: Use wallet changed observable?
      const sub = this.accountProvider.wallets.subscribe(() => {
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
    if (this.platform.is('ios')) {
      this.translate.get(['back-button']).subscribe((translated: { [key: string]: string | undefined }) => {
        const back: string = translated['back-button']
        this.config.set('backButtonText', back)
      })
    }
    if (this.platform.is('hybrid')) {
      this.app.addListener('appUrlOpen', (data: AppUrlOpen) => {
        this.ngZone.run(() => {
          if (data.url.startsWith('airgap-wallet://')) {
            console.log('Successfully matched route', JSON.stringify(data.url))
            this.schemeRoutingProvider.handleNewSyncRequest(this.router, data.url).catch(handleErrorSentry(ErrorCategory.SCHEME_ROUTING))
          } else {
            handleErrorSentry(ErrorCategory.DEEPLINK_PROVIDER)('route not matched: ' + JSON.stringify(data.url))
          }
        })
      })
    }
  }

  // TODO: Move to provider
  public async walletDeeplink() {
    const deeplinkInfo = await this.deepLinkProvider.walletDeepLink()
    const info = {
      wallet: deeplinkInfo.wallet,
      airGapTxs: deeplinkInfo.airGapTxs,
      data: deeplinkInfo.serializedTx
    }
    this.dataService.setData(DataServiceKey.TRANSACTION, info)
    this.router.navigateByUrl('/transaction-qr/' + DataServiceKey.TRANSACTION).catch(handleErrorSentry(ErrorCategory.NAVIGATION))
  }
}
