import {
  AddressService,
  AppInfoPlugin,
  APP_INFO_PLUGIN,
  APP_PLUGIN,
  ExternalAliasResolver,
  getProtocolAndNetworkIdentifier,
  IACMessageTransport,
  LanguageService,
  ProtocolService,
  SerializerService,
  SPLASH_SCREEN_PLUGIN,
  IsolatedModulesService
} from '@airgap/angular-core'

import {
  AirGapMarketWallet,
  IAirGapTransaction,
  ICoinProtocol,
  ICoinSubProtocol,
  MainProtocolSymbols,
  NetworkType
} from '@airgap/coinlib-core'
import { generateId, IACMessageType } from '@airgap/serializer'
import {
  TezosProtocolNetwork,
  TezosBlockExplorer,
  TezosNetwork,
  TezosIndexerClient,
  TezosProtocol,
  TezosProtocolOptions,
  TezosSaplingExternalMethodProvider,
  TezosShieldedTezProtocol,
  TezosSaplingProtocolOptions,
  TezosShieldedTezProtocolConfig,
  TezosKtProtocol,
  TezosFAProtocolOptions,
  TezosFA1p2Protocol,
  TezosFAProtocolConfig,
  TezosFA2ProtocolOptions,
  TezosFA2Protocol,
  TezosFA2ProtocolConfig,
  TezosDomains
} from '@airgap/tezos'
import { AfterViewInit, Component, Inject, NgZone } from '@angular/core'
import { Router } from '@angular/router'
import { AppPlugin, URLOpenListenerEvent } from '@capacitor/app'
import { SplashScreenPlugin } from '@capacitor/splash-screen'
import { Config, Platform } from '@ionic/angular'
import { TranslateService } from '@ngx-translate/core'
import { Subscription } from 'rxjs'

import { AccountProvider } from './services/account/account.provider'
import { AppService } from './services/app/app.service'
import { ThemeService } from './services/appearance/theme.service'
import { DataService, DataServiceKey } from './services/data/data.service'
import { IACService } from './services/iac/iac.service'
import { NavigationService } from './services/navigation/navigation.service'
import { PushProvider } from './services/push/push'
import { SaplingNativeService } from './services/sapling-native/sapling-native.service'
import { ErrorCategory, handleErrorSentry, setSentryRelease, setSentryUser } from './services/sentry-error-handler/sentry-error-handler'
import { WalletStorageKey, WalletStorageService } from './services/storage/storage'
import { WalletconnectService } from './services/walletconnect/walletconnect.service'
import { faProtocolSymbol } from './types/GenericProtocolSymbols'
import { generateGUID } from './utils/utils'
import { HttpClient } from '@angular/common/http'

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html'
})
export class AppComponent implements AfterViewInit {
  public isMobile: boolean = false
  public isElectron: boolean = false

  constructor(
    private readonly appSerivce: AppService,
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
    private readonly navigationService: NavigationService,
    private readonly isolatedModulesService: IsolatedModulesService,
    private readonly http: HttpClient,
    @Inject(APP_PLUGIN) private readonly app: AppPlugin,
    @Inject(APP_INFO_PLUGIN) private readonly appInfo: AppInfoPlugin,
    @Inject(SPLASH_SCREEN_PLUGIN) private readonly splashScreen: SplashScreenPlugin
  ) {
    this.initializeApp().catch(handleErrorSentry(ErrorCategory.OTHER))
    this.isMobile = this.platform.is('android') || this.platform.is('ios')
    this.isElectron = this.platform.is('electron')
  }

  public async initializeApp(): Promise<void> {
    await Promise.all([this.initializeTranslations(), this.platform.ready(), this.initializeProtocols(), this.initializeWalletConnect()])

    this.themeService.register()

    this.themeService.statusBarStyleDark(await this.themeService.isDarkMode())

    if (this.platform.is('hybrid')) {
      await Promise.all([this.splashScreen.hide(), this.pushProvider.initPush()])

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

    // Mt Perelin
    this.http
      .get('https://api.mtpelerin.com/currencies/tokens')
      .toPromise()
      .then((result) => {
        this.storageProvider.setCache('mtperelin-currencies', result)
      })

    this.appSerivce.setReady()
  }

  public async ngAfterViewInit(): Promise<void> {
    await this.platform.ready()
    if (this.platform.is('android')) {
      this.platform.backButton.subscribeWithPriority(-1, () => {
        this.navigationService.handleBackNavigation(this.router.url)
      })
    }
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
      supportedLanguages: ['en', 'de', 'zh'],
      defaultLanguage: 'en'
    })
  }
  private async initializeWalletConnect(): Promise<void> {
    this.walletconnectService.initWalletConnect()
  }

  private async initializeProtocols(): Promise<void> {
    const v1Protocols = await this.isolatedModulesService.loadProtocols('online')

    const ghostnetNetwork: TezosProtocolNetwork = new TezosProtocolNetwork(
      'Ghostnet',
      NetworkType.TESTNET,
      'https://tezos-ghostnet-node.prod.gke.papers.tech',
      new TezosBlockExplorer('https://ghostnet.tzkt.io'),
      {
        network: TezosNetwork.GHOSTNET,
        indexerClient: new TezosIndexerClient('https://tezos-ghostnet-indexer.prod.gke.papers.tech')
      }
    )
    const ghostnetProtocol: TezosProtocol = new TezosProtocol(new TezosProtocolOptions(ghostnetNetwork))

    await this.protocolService.init({
      extraActiveProtocols: [ghostnetProtocol, ...v1Protocols.activeProtocols],
      extraPassiveProtocols: v1Protocols.passiveProtocols.length > 0 ? [...v1Protocols.passiveProtocols] : undefined,
      extraActiveSubProtocols: v1Protocols.activeSubProtocols.length > 0 ? [...v1Protocols.activeSubProtocols] : undefined,
      extraPassiveSubProtocols: [
        [ghostnetProtocol, new TezosKtProtocol(new TezosProtocolOptions(ghostnetNetwork))],
        ...v1Protocols.passiveSubProtocols
      ]
    })

    await Promise.all([this.initSaplingProtocols(), this.getGenericSubProtocols(), this.initializeTezosDomains()])
  }

  private async initSaplingProtocols(networks: TezosProtocolNetwork[] = []): Promise<void> {
    if (networks.length === 0) {
      const supportedNetworks = (await this.protocolService.getNetworksForProtocol(MainProtocolSymbols.XTZ)) as TezosProtocolNetwork[]
      networks.push(...supportedNetworks)
    }

    const externalMethodProvider:
      | TezosSaplingExternalMethodProvider
      | undefined = await this.saplingNativeService.createExternalMethodProvider()

    const shieldedTezProtocols = await Promise.all(
      networks.map(async (network) => {
        const contractAddresses = await this.storageProvider.get(WalletStorageKey.CONTRACT_ADDRESSES)
        const protocolAndNetworkIdentifier = await getProtocolAndNetworkIdentifier(MainProtocolSymbols.XTZ_SHIELDED, network)
        const contractAddress = contractAddresses[protocolAndNetworkIdentifier]?.address
        const configuration = contractAddresses[protocolAndNetworkIdentifier]?.configuration

        return new TezosShieldedTezProtocol(
          new TezosSaplingProtocolOptions(
            network,
            new TezosShieldedTezProtocolConfig(undefined, undefined, contractAddress, externalMethodProvider, configuration?.injectorUrl)
          )
        )
      })
    )

    await this.protocolService.addActiveMainProtocols(shieldedTezProtocols)
  }

  private async getGenericSubProtocols(): Promise<void> {
    const genericSubProtocols = await this.storageProvider.get(WalletStorageKey.GENERIC_SUBPROTOCOLS)
    const identifiersWithOptions = Object.entries(genericSubProtocols)
    const supportedTestNetworkIdentifiers = (await this.protocolService.getNetworksForProtocol(MainProtocolSymbols.XTZ))
      .filter((network) => network.type == NetworkType.TESTNET)
      .map((network) => network.identifier)
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
            tezosOptions.network.extras
          )
          if (
            tezosProtocolNetwork.type === NetworkType.TESTNET &&
            !supportedTestNetworkIdentifiers.includes(tezosProtocolNetwork.identifier)
          ) {
            delete genericSubProtocols[protocolNetworkIdentifier]
            return undefined
          }
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
    await this.storageProvider.set(WalletStorageKey.GENERIC_SUBPROTOCOLS, genericSubProtocols)
    await this.protocolService.addActiveSubProtocols(protocols)
  }

  private async initializeTezosDomains(): Promise<void> {
    const tezosDomainsAddresses: Record<TezosNetwork, string | undefined> = {
      [TezosNetwork.MAINNET]: 'KT1GBZmSxmnKJXGMdMLbugPfLyUPmuLSMwKS',
      [TezosNetwork.GHOSTNET]: undefined
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
