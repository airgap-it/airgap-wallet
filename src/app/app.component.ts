import { AeternityModule } from '@airgap/aeternity'
import {
  AddressService,
  AppInfoPlugin,
  APP_INFO_PLUGIN,
  APP_PLUGIN,
  convertFeeDefaultsV0ToV1,
  convertNetworkTypeV0ToV1,
  convertNetworkV0ToV1,
  createV0OptimismERC20Token,
  createV0TezosFA1p2Protocol,
  createV0TezosFA2Protocol,
  createV0TezosShieldedTezProtocol,
  ExternalAliasResolver,
  IACMessageTransport,
  LanguageService,
  ProtocolService,
  SerializerService,
  SPLASH_SCREEN_PLUGIN
} from '@airgap/angular-core'
import { AstarModule } from '@airgap/astar'
import { BitcoinModule } from '@airgap/bitcoin'
import {
  AirGapMarketWallet,
  IAirGapTransaction,
  ICoinProtocol,
  ICoinSubProtocol,
  MainProtocolSymbols,
  NetworkType,
  ProtocolNetwork,
  SubProtocolSymbols
} from '@airgap/coinlib-core'
import { CoreumModule } from '@airgap/coreum'
import { CosmosModule } from '@airgap/cosmos'
import { EthereumModule } from '@airgap/ethereum'
import { GroestlcoinModule } from '@airgap/groestlcoin'
import { ICPModule } from '@airgap/icp'
import { protocolNetworkIdentifier } from '@airgap/module-kit'
import { MoonbeamModule } from '@airgap/moonbeam'
import { OptimismModule } from '@airgap/optimism'
import { SerializedERC20Token } from '@airgap/optimism/v1/protocol/erc20/ERC20Token'
import { PolkadotModule } from '@airgap/polkadot'
import { generateId, IACMessageType } from '@airgap/serializer'
import { TezosDomains, TezosModule, TezosProtocolNetwork, TezosSaplingExternalMethodProvider } from '@airgap/tezos'
import {
  TezosFA2ProtocolOptions as TezosFA2ProtocolOptionsV0,
  TezosFAProtocolOptions as TezosFAProtocolOptionsV0,
  TezosNetwork as TezosNetworkV0,
  TezosProtocolNetwork as TezosProtocolNetworkV0,
  TezosProtocolOptions as TezosProtocolOptionsV0
} from '@airgap/tezos/v0'
import { TEZOS_GHOSTNET_PROTOCOL_NETWORK, TEZOS_MAINNET_PROTOCOL_NETWORK } from '@airgap/tezos/v1/protocol/TezosProtocol'
import { HttpClient } from '@angular/common/http'
import { AfterViewInit, Component, Inject, NgZone } from '@angular/core'
import { Router } from '@angular/router'
import { AppPlugin, URLOpenListenerEvent } from '@capacitor/app'
import { SplashScreenPlugin } from '@capacitor/splash-screen'
import { Platform } from '@ionic/angular'
import { TranslateService } from '@ngx-translate/core'
import { Subscription } from 'rxjs'
import { register } from 'swiper/element/bundle'

import { AccountProvider } from './services/account/account.provider'
import { AppService } from './services/app/app.service'
import { ThemeService } from './services/appearance/theme.service'
import { DataService, DataServiceKey } from './services/data/data.service'
import { IACService } from './services/iac/iac.service'
import { WalletModulesService } from './services/modules/modules.service'
import { NavigationService } from './services/navigation/navigation.service'
import { PushProvider } from './services/push/push'
import { SaplingNativeService } from './services/sapling-native/sapling-native.service'
import { ErrorCategory, handleErrorSentry, setSentryRelease, setSentryUser } from './services/sentry-error-handler/sentry-error-handler'
import { WalletStorageKey, WalletStorageService } from './services/storage/storage'
import { WalletconnectService } from './services/walletconnect/walletconnect.service'
import { faProtocolSymbol } from './types/GenericProtocolSymbols'
import { generateGUID, getProtocolAndNetworkIdentifier } from './utils/utils'

// Swiper
register()

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html'
})
export class AppComponent implements AfterViewInit {
  public isMobile: boolean = false
  public isElectron: boolean = false

  public constructor(
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
    private readonly ngZone: NgZone,
    private readonly saplingNativeService: SaplingNativeService,
    private readonly themeService: ThemeService,
    private readonly navigationService: NavigationService,
    private readonly modulesService: WalletModulesService,
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

        // Since Ionic v6 `Config.set` is no longer part of the API and it's recommended to make the per-platform configuration
        // with `IonicModule.forRoot` (https://ionicframework.com/docs/developing/config#per-platform-config).
        // The recommended way, however, doesn't support translations, hence we need the workaround below.
        const config = (window as any) /* as IonicWindow */.Ionic.config as Map<string, string>
        config.set('backButtonText', back)
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
    this.modulesService.init([
      new BitcoinModule(),
      new EthereumModule(),
      new TezosModule(),
      new PolkadotModule(),
      new CosmosModule(),
      new AeternityModule(),
      new GroestlcoinModule(),
      new MoonbeamModule(),
      new AstarModule(),
      new ICPModule(),
      new CoreumModule(),
      new OptimismModule()
    ])
    const v1Protocols = await this.modulesService.loadProtocols('online', [
      MainProtocolSymbols.XTZ_SHIELDED,
      SubProtocolSymbols.XTZ_STKR,
      SubProtocolSymbols.XTZ_W
    ])

    await this.protocolService.init({
      activeProtocols: v1Protocols.activeProtocols,
      passiveProtocols: v1Protocols.passiveProtocols,
      activeSubProtocols: v1Protocols.activeSubProtocols,
      passiveSubProtocols: v1Protocols.passiveSubProtocols
    })

    await Promise.all([this.initSaplingProtocols(), this.getGenericSubProtocols(), this.initializeTezosDomains()])
  }

  private async initSaplingProtocols(networks: ProtocolNetwork[] = []): Promise<void> {
    if (networks.length === 0) {
      const supportedNetworks: ProtocolNetwork[] = await this.protocolService.getNetworksForProtocol(MainProtocolSymbols.XTZ)
      networks.push(...supportedNetworks)
    }

    const externalMethodProvider:
      | TezosSaplingExternalMethodProvider
      | undefined = await this.saplingNativeService.createExternalMethodProvider()

    const shieldedTezProtocols = await Promise.all(
      networks.map(async (networkV0) => {
        const contractAddresses = await this.storageProvider.get(WalletStorageKey.CONTRACT_ADDRESSES)
        const protocolAndNetworkIdentifier = await getProtocolAndNetworkIdentifier(MainProtocolSymbols.XTZ_SHIELDED, networkV0)
        const contractAddress = contractAddresses[protocolAndNetworkIdentifier]?.address
        const configuration = contractAddresses[protocolAndNetworkIdentifier]?.configuration
        const networkV1 = convertNetworkV0ToV1(networkV0) as TezosProtocolNetwork

        return createV0TezosShieldedTezProtocol({
          network: {
            ...networkV1,
            contractAddress,
            injectorUrl: configuration?.injectorUrl
          },
          externalProvider: externalMethodProvider
        })
      })
    )

    await this.protocolService.addActiveMainProtocols(shieldedTezProtocols)
  }

  // TODO: remove v0 types keeping backwards compatibility
  private async getGenericSubProtocols(): Promise<void> {
    const genericSubProtocols = await this.storageProvider.get(WalletStorageKey.GENERIC_SUBPROTOCOLS)
    const identifiersWithSerialized = Object.entries(genericSubProtocols)
    const supportedTezosTestNetworkIdentifiers = (await this.protocolService.getNetworksForProtocol(MainProtocolSymbols.XTZ))
      .filter((network) => network.type == NetworkType.TESTNET)
      .map((network) => network.identifier)
    const protocolsOrUndefineds = await Promise.all(
      identifiersWithSerialized.map(([protocolNetworkIdentifier, serialized]) => {
        const [protocolIdentifier] = protocolNetworkIdentifier.split(':')

        try {
          if (protocolIdentifier.startsWith(MainProtocolSymbols.XTZ)) {
            return this.deserializeGenericTezosSubProtocol(protocolIdentifier, serialized, supportedTezosTestNetworkIdentifiers)
          } else if (protocolIdentifier.startsWith(MainProtocolSymbols.OPTIMISM)) {
            return this.deserializeOptimismERC20Token(serialized)
          }

          return undefined
        } catch {
          delete genericSubProtocols[protocolNetworkIdentifier]
          return undefined
        }
      })
    )
    const protocols = protocolsOrUndefineds.filter((protocolOrUndefined) => protocolOrUndefined !== undefined)

    await this.storageProvider.set(WalletStorageKey.GENERIC_SUBPROTOCOLS, genericSubProtocols)
    await this.protocolService.addActiveSubProtocols(protocols)
  }

  private async deserializeGenericTezosSubProtocol(
    protocolIdentifier: string,
    serialized: any,
    supportedTestNetworkIdentifiers: string[]
  ): Promise<ICoinSubProtocol | undefined> {
    const tezosOptions = serialized as TezosProtocolOptionsV0
    const tezosProtocolNetwork = new TezosProtocolNetworkV0(
      tezosOptions.network.name,
      tezosOptions.network.type,
      tezosOptions.network.rpcUrl,
      tezosOptions.network.blockExplorer,
      tezosOptions.network.extras
    )
    if (tezosProtocolNetwork.type === NetworkType.TESTNET && !supportedTestNetworkIdentifiers.includes(tezosProtocolNetwork.identifier)) {
      throw new Error()
    }

    if (protocolIdentifier.startsWith(faProtocolSymbol('1.2'))) {
      const faOptions = tezosOptions as TezosFAProtocolOptionsV0

      return createV0TezosFA1p2Protocol({
        network: {
          ...this.convertLegacyTezosNetwork(tezosProtocolNetwork),
          contractAddress: faOptions.config.contractAddress,
          tokenMetadataBigMapId: faOptions.config.tokenMetadataBigMapID
        },
        identifier: faOptions.config.identifier,
        name: faOptions.config.name,
        units: faOptions.config.symbol
          ? {
              [faOptions.config.symbol]: {
                symbol: { value: faOptions.config.symbol, market: faOptions.config.marketSymbol },
                decimals: faOptions.config.decimals
              }
            }
          : undefined,
        mainUnit: faOptions.config.symbol,
        feeDefaults:
          faOptions.config.feeDefaults && faOptions.config.decimals !== undefined
            ? convertFeeDefaultsV0ToV1(faOptions.config.feeDefaults, faOptions.config.decimals)
            : undefined
      })
    } else if (protocolIdentifier.startsWith(faProtocolSymbol('2'))) {
      const fa2Options = tezosOptions as TezosFA2ProtocolOptionsV0

      return createV0TezosFA2Protocol({
        network: {
          ...this.convertLegacyTezosNetwork(tezosProtocolNetwork),
          contractAddress: fa2Options.config.contractAddress,
          tokenId: fa2Options.config.defaultTokenID,
          tokenMetadataBigMapId: fa2Options.config.tokenMetadataBigMapID,
          ledgerBigMapId: fa2Options.config.ledgerBigMapID,
          totalSupplyBigMapId: fa2Options.config.totalSupplyBigMapID
        },
        identifier: fa2Options.config.identifier,
        name: fa2Options.config.name,
        units: fa2Options.config.symbol
          ? {
              [fa2Options.config.symbol]: {
                symbol: { value: fa2Options.config.symbol, market: fa2Options.config.marketSymbol },
                decimals: fa2Options.config.decimals
              }
            }
          : undefined,
        mainUnit: fa2Options.config.symbol,
        feeDefaults:
          fa2Options.config.feeDefaults && fa2Options.config.decimals !== undefined
            ? convertFeeDefaultsV0ToV1(fa2Options.config.feeDefaults, fa2Options.config.decimals)
            : undefined
      })
    }

    return undefined
  }

  private convertLegacyTezosNetwork(network: TezosProtocolNetworkV0): TezosProtocolNetwork {
    const baseRecord: Record<TezosNetworkV0, TezosProtocolNetwork> = {
      [TezosNetworkV0.MAINNET]: TEZOS_MAINNET_PROTOCOL_NETWORK,
      [TezosNetworkV0.GHOSTNET]: TEZOS_GHOSTNET_PROTOCOL_NETWORK
    }

    const base: TezosProtocolNetwork = baseRecord[network.extras.network]

    return {
      ...base,
      name: network.name,
      type: convertNetworkTypeV0ToV1(network.type),
      rpcUrl: network.rpcUrl,
      network: network.extras.network,
      blockExplorerUrl:
        network.blockExplorer && network.blockExplorer.blockExplorer ? network.blockExplorer.blockExplorer : base.blockExplorerUrl,
      indexerApi:
        network.extras.indexerClient && network.extras.indexerClient.baseUrl ? network.extras.indexerClient.baseUrl : base.indexerApi
    }
  }

  private async deserializeOptimismERC20Token(serialized: any): Promise<ICoinSubProtocol> {
    // TODO: use module's `deserializeOfflineProtocol` directly
    // (currently it's easier to use `createV0OptimismERC20Token` because it wraps v1 protocol in the v0 adapter)
    const serializedERC20Token = serialized as SerializedERC20Token
    return createV0OptimismERC20Token(serializedERC20Token.metadata, { network: serializedERC20Token.network })
  }

  private async initializeTezosDomains(): Promise<void> {
    const tezosDomainsAddresses: Record<TezosNetworkV0, string | undefined> = {
      [TezosNetworkV0.MAINNET]: 'KT1GBZmSxmnKJXGMdMLbugPfLyUPmuLSMwKS',
      [TezosNetworkV0.GHOSTNET]: undefined
    }

    const tezosNetworks: ProtocolNetwork[] = await this.protocolService.getNetworksForProtocol(MainProtocolSymbols.XTZ)

    const tezosDomainsWithNetwork: [TezosProtocolNetwork, TezosDomains][] = tezosNetworks
      .map((networkV0: ProtocolNetwork) => {
        const networkV1 = convertNetworkV0ToV1(networkV0) as TezosProtocolNetwork
        const contractAddress: string | undefined = tezosDomainsAddresses[networkV1.network]

        return contractAddress !== undefined
          ? ([networkV1, new TezosDomains(networkV1, contractAddress)] as [TezosProtocolNetwork, TezosDomains])
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

        const networkIdentifier: string = protocolNetworkIdentifier(network)

        const [tezosProtocol, tezosSubProtocols]: [ICoinProtocol, ICoinSubProtocol[]] = await Promise.all([
          this.protocolService.getProtocol(MainProtocolSymbols.XTZ, networkIdentifier),
          this.protocolService.getSubProtocols(MainProtocolSymbols.XTZ, networkIdentifier)
        ])

        this.addressService.registerExternalAliasResolver(externalAliasResolver, tezosProtocol)
        tezosSubProtocols.forEach((subProtocol: ICoinSubProtocol) => {
          this.addressService.registerExternalAliasResolver(externalAliasResolver, subProtocol)
        })
      })
    )
  }
}
