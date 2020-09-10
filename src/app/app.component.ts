import { APP_PLUGIN, LanguageService, ProtocolService, SPLASH_SCREEN_PLUGIN, STATUS_BAR_PLUGIN } from '@airgap/angular-core'
import { AfterViewInit, Component, Inject, NgZone } from '@angular/core'
import { Router } from '@angular/router'
import { AppPlugin, AppUrlOpen, SplashScreenPlugin, StatusBarPlugin, StatusBarStyle } from '@capacitor/core'
import { Config, Platform } from '@ionic/angular'
import { TranslateService } from '@ngx-translate/core'
import {
  TezblockBlockExplorer,
  TezosBTC,
  TezosBTCProtocolConfig,
  TezosFAProtocolOptions,
  TezosKtProtocol,
  TezosProtocol,
  TezosProtocolNetwork,
  TezosProtocolNetworkExtras,
  TezosProtocolOptions
} from 'airgap-coin-lib'
import { TezosNetwork } from 'airgap-coin-lib/dist/protocols/tezos/TezosProtocol'
import { NetworkType } from 'airgap-coin-lib/dist/utils/ProtocolNetwork'
import { Subscription } from 'rxjs'

import { AccountProvider } from './services/account/account.provider'
import { AppInfoProvider } from './services/app-info/app-info'
import { DataService, DataServiceKey } from './services/data/data.service'
import { DeepLinkProvider } from './services/deep-link/deep-link'
import { PushProvider } from './services/push/push'
import { SchemeRoutingProvider } from './services/scheme-routing/scheme-routing'
import { ErrorCategory, handleErrorSentry, setSentryRelease, setSentryUser } from './services/sentry-error-handler/sentry-error-handler'
import { WalletStorageKey, WalletStorageService } from './services/storage/storage'
import { generateGUID } from './utils/utils'

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html'
})
export class AppComponent implements AfterViewInit {
  public isMobile: boolean = false
  public isElectron: boolean = false

  constructor(
    private readonly platform: Platform,
    private readonly translate: TranslateService,
    private readonly languageService: LanguageService,
    private readonly schemeRoutingProvider: SchemeRoutingProvider,
    private readonly protocolService: ProtocolService,
    private readonly storageProvider: WalletStorageService,
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
    this.isElectron = this.platform.is('electron')
  }

  public async initializeApp(): Promise<void> {
    await Promise.all([this.initializeTranslations(), this.platform.ready()])

    this.initializeProtocols()

    if (this.platform.is('hybrid')) {
      await Promise.all([
        this.statusBar.setStyle({ style: StatusBarStyle.Light }),
        this.statusBar.setBackgroundColor({ color: '#FFFFFF' }),
        this.splashScreen.hide(),

        this.pushProvider.initPush()
      ])
    }

    this.appInfoProvider
      .getVersionNumber()
      .then((version: string) => {
        if (this.platform.is('hybrid')) {
          setSentryRelease(`app_${version}`)
        } else {
          setSentryRelease(`browser_${version}`) // TODO: Set version in CI once we have browser version
        }
      })
      .catch(handleErrorSentry(ErrorCategory.CORDOVA_PLUGIN))

    let userId: string = await this.storageProvider.get(WalletStorageKey.USER_ID)
    if (!userId) {
      userId = generateGUID()
      this.storageProvider.set(WalletStorageKey.USER_ID, userId).catch(handleErrorSentry(ErrorCategory.STORAGE))
    }
    setSentryUser(userId)

    const url: URL = new URL(location.href)

    if (url.searchParams.get('rawUnsignedTx')) {
      // Wait until wallets are initialized
      // TODO: Use wallet changed observable?
      const sub: Subscription = this.accountProvider.wallets.subscribe(async () => {
        await this.walletDeeplink()
        if (sub) {
          sub.unsubscribe()
        }
      })
    }
  }

  public async ngAfterViewInit(): Promise<void> {
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
            // tslint:disable-next-line: no-console
            console.log('Successfully matched route', JSON.stringify(data.url))
            this.schemeRoutingProvider.handleNewSyncRequest(this.router, data.url).catch(handleErrorSentry(ErrorCategory.SCHEME_ROUTING))
          } else {
            handleErrorSentry(ErrorCategory.DEEPLINK_PROVIDER)(`route not matched: ${JSON.stringify(data.url)}`)
          }
        })
      })
    }
  }

  // TODO: Move to provider
  public async walletDeeplink(): Promise<void> {
    const deeplinkInfo = await this.deepLinkProvider.walletDeepLink()
    const info = {
      wallet: deeplinkInfo.wallet,
      airGapTxs: deeplinkInfo.airGapTxs,
      data: deeplinkInfo.serializedTx
    }
    this.dataService.setData(DataServiceKey.TRANSACTION, info)
    this.router.navigateByUrl(`/transaction-qr/${DataServiceKey.TRANSACTION}`).catch(handleErrorSentry(ErrorCategory.NAVIGATION))
  }

  private async initializeTranslations(): Promise<void> {
    return this.languageService.init({
      supportedLanguages: ['en', 'de', 'zh-cn'],
      defaultLanguage: 'en'
    })
  }

  private initializeProtocols(): void {
    const carthagenetNetwork: TezosProtocolNetwork = new TezosProtocolNetwork(
      'Carthagenet',
      NetworkType.TESTNET,
      'https://tezos-carthagenet-node-1.kubernetes.papers.tech',
      new TezblockBlockExplorer('https://carthagenet.tezblock.io'),
      new TezosProtocolNetworkExtras(
        TezosNetwork.CARTHAGENET,
        'https://tezos-carthagenet-conseil-1.kubernetes.papers.tech',
        TezosNetwork.CARTHAGENET,
        'airgap00391'
      )
    )
    const carthagenetProtocol: TezosProtocol = new TezosProtocol(new TezosProtocolOptions(carthagenetNetwork))

    this.protocolService.init({
      extraActiveProtocols: [carthagenetProtocol],
      extraPassiveSubProtocols: [
        [carthagenetProtocol, new TezosKtProtocol(new TezosProtocolOptions(carthagenetNetwork))],
        [
          carthagenetProtocol,
          new TezosBTC(
            new TezosFAProtocolOptions(
              carthagenetNetwork,
              new TezosBTCProtocolConfig(undefined, undefined, undefined, undefined, 'KT1TH8YZqLy2GFe7yy2JC7oazRj8nyMtzy4W')
            )
          )
        ]
      ]
    })
  }
}
