import {
  AddressService,
  AppInfoPlugin,
  APP_INFO_PLUGIN,
  APP_PLUGIN,
  ExternalAliasResolver,
  IACMessageTransport,
  LanguageService,
  ProtocolService,
  SerializerService,
  SPLASH_SCREEN_PLUGIN,
  STATUS_BAR_PLUGIN
} from '@airgap/angular-core'
import {
  AirGapMarketWallet,
  generateId,
  IACMessageType,
  IAirGapTransaction,
  ICoinProtocol,
  ICoinSubProtocol,
  MainProtocolSymbols,
  NetworkType,
  TezblockBlockExplorer,
  TezosFA1p2Protocol,
  TezosFA2Protocol,
  TezosFA2ProtocolConfig,
  TezosFA2ProtocolOptions,
  TezosFAProtocolConfig,
  TezosFAProtocolOptions,
  TezosKtProtocol,
  TezosNetwork,
  TezosProtocol,
  TezosProtocolNetwork,
  TezosProtocolNetworkExtras,
  TezosProtocolOptions,
  TezosSaplingExternalMethodProvider,
  TezosShieldedTezProtocol
} from '@airgap/coinlib-core'
import { TezosDomains } from '@airgap/coinlib-core/protocols/tezos/domains/TezosDomains'
import {
  TezosSaplingProtocolOptions,
  TezosShieldedTezProtocolConfig
} from '@airgap/coinlib-core/protocols/tezos/sapling/TezosSaplingProtocolOptions'
import { AfterViewInit, Component, Inject, NgZone } from '@angular/core'
import { Router } from '@angular/router'
import { AppPlugin, URLOpenListenerEvent } from '@capacitor/app'
import { SplashScreenPlugin } from '@capacitor/splash-screen'
import { StatusBarPlugin, Style } from '@capacitor/status-bar'
import { Config, Platform } from '@ionic/angular'
import { TranslateService } from '@ngx-translate/core'
import { Subscription } from 'rxjs'

import { AccountProvider } from './services/account/account.provider'
import { ThemeService } from './services/appearance/theme.service'
import { DataService, DataServiceKey } from './services/data/data.service'
import { IACService } from './services/iac/iac.service'
import { PushProvider } from './services/push/push'
import { SaplingNativeService } from './services/sapling-native/sapling-native.service'
import { ErrorCategory, handleErrorSentry, setSentryRelease, setSentryUser } from './services/sentry-error-handler/sentry-error-handler'
import { WalletStorageKey, WalletStorageService } from './services/storage/storage'
import { WalletconnectService } from './services/walletconnect/walletconnect.service'
import { faProtocolSymbol } from './types/GenericProtocolSymbols'
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
    private readonly iacService: IACService,
    private readonly protocolService: ProtocolService,
    private readonly storageProvider: WalletStorageService,
    private readonly accountProvider: AccountProvider,
    private readonly addressService: AddressService,
    private readonly serializerService: SerializerService,
    private readonly pushProvider: PushProvider,
    private readonly walletconnectService: WalletconnectService,
    private readonly router: Router,
    private readonly dataService: DataService,
    private readonly config: Config,
    private readonly ngZone: NgZone,
    private readonly saplingNativeService: SaplingNativeService,
    private readonly themeService: ThemeService,
    @Inject(APP_PLUGIN) private readonly app: AppPlugin,
    @Inject(APP_INFO_PLUGIN) private readonly appInfo: AppInfoPlugin,
    @Inject(SPLASH_SCREEN_PLUGIN) private readonly splashScreen: SplashScreenPlugin,
    @Inject(STATUS_BAR_PLUGIN) private readonly statusBar: StatusBarPlugin
  ) {
    this.initializeApp().catch(handleErrorSentry(ErrorCategory.OTHER))
    this.isMobile = this.platform.is('android') || this.platform.is('ios')
    this.isElectron = this.platform.is('electron')
  }

  public async initializeApp(): Promise<void> {
    await Promise.all([this.initializeTranslations(), this.platform.ready(), this.initializeProtocols(), this.initializeWalletConnect()])

    this.themeService.register()

    if (this.platform.is('hybrid')) {
      await Promise.all([
        this.statusBar.setStyle({ style: this.themeService.isDarkMode() ? Style.Dark : Style.Light }),
        this.statusBar.setBackgroundColor({ color: this.themeService.isDarkMode() ? '#121212' : '#FFFFFF' }),

        this.splashScreen.hide(),
        this.pushProvider.initPush()
      ])

      this.appInfo
        .get()
        .then((appInfo: { appName: string; packageName: string; versionName: string; versionCode: number }) => {
          setSentryRelease(`app_${appInfo.versionName}`)
        })
        .catch(handleErrorSentry(ErrorCategory.CORDOVA_PLUGIN))
    }

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
      const sub: Subscription = this.accountProvider.wallets$.subscribe(async () => {
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
      this.app.addListener('appUrlOpen', (data: URLOpenListenerEvent) => {
        this.ngZone.run(() => {
          if (data.url === 'airgap-wallet://' || data.url === 'https://wallet.airgap.it' || data.url === 'https://wallet.airgap.it/') {
            // Ignore empty deeplinks
            return
          }
          this.iacService.handleRequest(data.url, IACMessageTransport.DEEPLINK).catch(handleErrorSentry(ErrorCategory.SCHEME_ROUTING))
        })
      })
    }
  }

  // TODO: Move to provider
  public async walletDeeplink(): Promise<void> {
    const url: URL = new URL(location.href)
    const publicKey: string = url.searchParams.get('publicKey')
    const rawUnsignedTx: unknown = JSON.parse(url.searchParams.get('rawUnsignedTx'))
    const identifier: string = url.searchParams.get('identifier')

    const wallet: AirGapMarketWallet = this.accountProvider.walletByPublicKeyAndProtocolAndAddressIndex(publicKey, identifier)
    const airGapTxs: IAirGapTransaction[] = await wallet.protocol.getTransactionDetails({
      publicKey: wallet.publicKey,
      transaction: rawUnsignedTx
    })

    const serializedTx: string | string[] = await this.serializerService.serialize([
      {
        id: generateId(8),
        protocol: wallet.protocol.identifier,
        type: IACMessageType.TransactionSignRequest,
        payload: {
          publicKey: wallet.publicKey,
          transaction: rawUnsignedTx as any,
          callbackURL: 'airgap-wallet://?d='
        }
      }
    ])

    const info = {
      wallet,
      airGapTxs,
      data: serializedTx
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
  private async initializeWalletConnect(): Promise<void> {
    this.walletconnectService.initWalletConnect()
  }

  private async initializeProtocols(): Promise<void> {
    const granadanetNetwork: TezosProtocolNetwork = new TezosProtocolNetwork(
      'Granadanet',
      NetworkType.TESTNET,
      'https://tezos-granadanet-node.prod.gke.papers.tech',
      new TezblockBlockExplorer('https//granadanet.tezblock.io'),
      new TezosProtocolNetworkExtras(
        TezosNetwork.GRANADANET,
        'https://tezos-granadanet-conseil.prod.gke.papers.tech',
        TezosNetwork.MAINNET,
        'airgap00391'
      )
    )
    const granadanetProtocol: TezosProtocol = new TezosProtocol(new TezosProtocolOptions(granadanetNetwork))

    const hangzhounetNetwork: TezosProtocolNetwork = new TezosProtocolNetwork(
      'Hangzhounet',
      NetworkType.TESTNET,
      'https://tezos-hangzhounet-node.prod.gke.papers.tech',
      new TezblockBlockExplorer('https//hangzhounet.tezblock.io'),
      new TezosProtocolNetworkExtras(
        TezosNetwork.HANGZHOUNET,
        'https://tezos-hangzhounet-conseil.prod.gke.papers.tech',
        TezosNetwork.HANGZHOUNET,
        'airgap00391'
      )
    )
    const hangzhounetProtocol: TezosProtocol = new TezosProtocol(new TezosProtocolOptions(hangzhounetNetwork))

    const externalMethodProvider:
      | TezosSaplingExternalMethodProvider
      | undefined = await this.saplingNativeService.createExternalMethodProvider()

    const shieldedTezProtocol: TezosShieldedTezProtocol = new TezosShieldedTezProtocol(
      new TezosSaplingProtocolOptions(
        hangzhounetNetwork,
        new TezosShieldedTezProtocolConfig(undefined, undefined, undefined, externalMethodProvider)
      )
    )

    this.protocolService.init({
      extraActiveProtocols: [hangzhounetProtocol, granadanetProtocol, shieldedTezProtocol],
      extraPassiveSubProtocols: [[granadanetProtocol, new TezosKtProtocol(new TezosProtocolOptions(granadanetNetwork))]]
    })

    await Promise.all([this.getGenericSubProtocols(), this.initializeTezosDomains()])
  }

  private async getGenericSubProtocols(): Promise<void> {
    const genericSubProtocols = await this.storageProvider.get(WalletStorageKey.GENERIC_SUBPROTOCOLS)
    const identifiersWithOptions = Object.entries(genericSubProtocols)
    const protocols = identifiersWithOptions
      .map(([protocolNetworkIdentifier, options]) => {
        const [protocolIdentifier] = protocolNetworkIdentifier.split(':')

        if (protocolIdentifier.startsWith(MainProtocolSymbols.XTZ)) {
          const tezosOptions = options as TezosProtocolOptions
          const tezosProtocolNetwork = new TezosProtocolNetwork(
            tezosOptions.network.name,
            tezosOptions.network.type,
            tezosOptions.network.rpcUrl,
            tezosOptions.network.blockExplorer,
            new TezosProtocolNetworkExtras(
              tezosOptions.network.extras.network,
              tezosOptions.network.extras.conseilUrl,
              tezosOptions.network.extras.conseilNetwork,
              tezosOptions.network.extras.conseilApiKey
            )
          )
          if (protocolIdentifier.startsWith(faProtocolSymbol('1.2'))) {
            const faOptions = tezosOptions as TezosFAProtocolOptions

            return new TezosFA1p2Protocol(
              new TezosFAProtocolOptions(
                tezosProtocolNetwork,
                new TezosFAProtocolConfig(
                  faOptions.config.contractAddress,
                  faOptions.config.identifier,
                  faOptions.config.symbol,
                  faOptions.config.name,
                  faOptions.config.marketSymbol,
                  faOptions.config.feeDefaults,
                  faOptions.config.decimals,
                  faOptions.config.tokenMetadataBigMapID
                )
              )
            )
          } else if (protocolIdentifier.startsWith(faProtocolSymbol('2'))) {
            const fa2Options = tezosOptions as TezosFA2ProtocolOptions

            return new TezosFA2Protocol(
              new TezosFA2ProtocolOptions(
                tezosProtocolNetwork,
                new TezosFA2ProtocolConfig(
                  fa2Options.config.contractAddress,
                  fa2Options.config.identifier,
                  fa2Options.config.symbol,
                  fa2Options.config.name,
                  fa2Options.config.marketSymbol,
                  fa2Options.config.feeDefaults,
                  fa2Options.config.decimals,
                  fa2Options.config.defaultTokenID,
                  fa2Options.config.tokenMetadataBigMapID,
                  fa2Options.config.ledgerBigMapID,
                  fa2Options.config.totalSupplyBigMapID
                )
              )
            )
          }
        }

        return undefined
      })
      .filter((protocol) => protocol !== undefined)

    await this.protocolService.addActiveSubProtocols(protocols)
  }

  private async initializeTezosDomains(): Promise<void> {
    const tezosDomainsAddresses: Record<TezosNetwork, string | undefined> = {
      [TezosNetwork.MAINNET]: 'KT1GBZmSxmnKJXGMdMLbugPfLyUPmuLSMwKS',
      [TezosNetwork.EDONET]: 'KT1JJbWfW8CHUY95hG9iq2CEMma1RiKhMHDR',
      [TezosNetwork.FLORENCENET]: 'KT1PfBfkfUuvQRN8zuCAyp5MHjNrQqgevS9p',
      [TezosNetwork.GRANADANET]: 'KT1Ch6PstAQG32uNfQJUSL2bf2WvimvY5umk',
      [TezosNetwork.HANGZHOUNET]: 'KT1MgQjmWMBQ4LyuMAqZccTkMSUJbEXeGqii'
    }

    const tezosNetworks: TezosProtocolNetwork[] = (await this.protocolService.getNetworksForProtocol(
      MainProtocolSymbols.XTZ
    )) as TezosProtocolNetwork[]

    const tezosDomainsWithNetwork: [TezosProtocolNetwork, TezosDomains][] = tezosNetworks
      .map((network: TezosProtocolNetwork) => {
        const contractAddress: string | undefined = tezosDomainsAddresses[network.extras.network]

        return contractAddress !== undefined
          ? ([network, new TezosDomains(network, contractAddress)] as [TezosProtocolNetwork, TezosDomains])
          : undefined
      })
      .filter((tezosDomainsWithNetwork: [TezosProtocolNetwork, TezosDomains] | undefined) => tezosDomainsWithNetwork !== undefined)

    await Promise.all(
      tezosDomainsWithNetwork.map(async ([network, tezosDomains]: [TezosProtocolNetwork, TezosDomains]) => {
        const externalAliasResolver: ExternalAliasResolver = {
          validateReceiver: async (receiver: string): Promise<boolean> => (await tezosDomains.nameToAddress(receiver)) !== undefined,
          resolveAlias: tezosDomains.nameToAddress.bind(tezosDomains),
          getAlias: tezosDomains.addressToName.bind(tezosDomains)
        }

        const [tezosProtocol, tezosSubProtocols]: [ICoinProtocol, ICoinSubProtocol[]] = await Promise.all([
          this.protocolService.getProtocol(MainProtocolSymbols.XTZ, network),
          this.protocolService.getSubProtocols(MainProtocolSymbols.XTZ, network)
        ])

        this.addressService.registerExternalAliasResolver(externalAliasResolver, tezosProtocol)
        tezosSubProtocols.forEach((subProtocol: ICoinSubProtocol) => {
          this.addressService.registerExternalAliasResolver(externalAliasResolver, subProtocol)
        })
      })
    )
  }
}
