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
  TezosBTC,
  TezosBTCProtocolConfig,
  TezosFAProtocolOptions,
  TezosKtProtocol,
  TezosNetwork,
  TezosProtocol,
  TezosProtocolNetwork,
  TezosProtocolNetworkExtras,
  TezosProtocolOptions
} from '@airgap/coinlib-core'
import { TezosDomains } from '@airgap/coinlib-core/protocols/tezos/domains/TezosDomains'
import { AfterViewInit, Component, Inject, NgZone } from '@angular/core'
import { Router } from '@angular/router'
import { AppPlugin, AppUrlOpen, SplashScreenPlugin, StatusBarPlugin, StatusBarStyle } from '@capacitor/core'
import { Config, Platform } from '@ionic/angular'
import { TranslateService } from '@ngx-translate/core'
import { Subscription } from 'rxjs'

import { AccountProvider } from './services/account/account.provider'
import { DataService, DataServiceKey } from './services/data/data.service'
import { IACService } from './services/iac/iac.service'
import { PushProvider } from './services/push/push'
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
    private readonly iacService: IACService,
    private readonly protocolService: ProtocolService,
    private readonly storageProvider: WalletStorageService,
    private readonly accountProvider: AccountProvider,
    private readonly addressService: AddressService,
    private readonly serializerService: SerializerService,
    private readonly pushProvider: PushProvider,
    private readonly router: Router,
    private readonly dataService: DataService,
    private readonly config: Config,
    private readonly ngZone: NgZone,
    @Inject(APP_PLUGIN) private readonly app: AppPlugin,
    @Inject(APP_INFO_PLUGIN) private readonly appInfo: AppInfoPlugin,
    @Inject(SPLASH_SCREEN_PLUGIN) private readonly splashScreen: SplashScreenPlugin,
    @Inject(STATUS_BAR_PLUGIN) private readonly statusBar: StatusBarPlugin
  ) {
    this.initializeApp().catch(handleErrorSentry(ErrorCategory.OTHER))
    this.isMobile = this.platform.is('mobile')
    this.isElectron = this.platform.is('electron')
  }

  public async initializeApp(): Promise<void> {
    await Promise.all([this.initializeTranslations(), this.platform.ready(), this.initializeProtocols()])

    if (this.platform.is('hybrid')) {
      await Promise.all([
        this.statusBar.setStyle({ style: StatusBarStyle.Light }),
        this.statusBar.setBackgroundColor({ color: '#FFFFFF' }),
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
          // tslint:disable-next-line: no-console
          console.log('Successfully received deeplink', data.url)
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
    console.log('publicKey', publicKey)
    console.log('rawUnsignedTx', rawUnsignedTx)
    console.log('identifier', identifier)

    const wallet: AirGapMarketWallet = this.accountProvider.walletByPublicKeyAndProtocolAndAddressIndex(publicKey, identifier)
    const airGapTxs: IAirGapTransaction[] = await wallet.protocol.getTransactionDetails({
      publicKey: wallet.publicKey,
      transaction: rawUnsignedTx
    })

    const serializedTx: string[] = await this.serializerService.serialize([
      {
        id: generateId(10),
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

  private async initializeProtocols(): Promise<void> {
    const delphinetNetwork: TezosProtocolNetwork = new TezosProtocolNetwork(
      'Delphinet',
      NetworkType.TESTNET,
      'https://tezos-delphinet-node.prod.gke.papers.tech',
      new TezblockBlockExplorer('https://delphinet.tezblock.io'),
      new TezosProtocolNetworkExtras(
        TezosNetwork.DELPHINET,
        'https://tezos-delphinet-conseil.prod.gke.papers.tech',
        TezosNetwork.DELPHINET,
        'airgap00391'
      )
    )
    const delphinetProtocol: TezosProtocol = new TezosProtocol(new TezosProtocolOptions(delphinetNetwork))

    const edonetNetwork: TezosProtocolNetwork = new TezosProtocolNetwork(
      'Edonet',
      NetworkType.TESTNET,
      'https://tezos-edonet-node.prod.gke.papers.tech',
      new TezblockBlockExplorer('https//edonet.tezblock.io'),
      new TezosProtocolNetworkExtras(
        TezosNetwork.EDONET,
        'https://conseil-edo.cryptonomic-infra.tech',
        TezosNetwork.EDONET,
        '8385d3cd-7157-481c-873f-17f99b910fb9'
      )
    )
    const edonetProtocol: TezosProtocol = new TezosProtocol(new TezosProtocolOptions(edonetNetwork))

    this.protocolService.init({
      extraActiveProtocols: [delphinetProtocol, edonetProtocol],
      extraPassiveSubProtocols: [
        [delphinetProtocol, new TezosKtProtocol(new TezosProtocolOptions(delphinetNetwork))],
        [edonetProtocol, new TezosKtProtocol(new TezosProtocolOptions(edonetNetwork))],
        [
          delphinetProtocol,
          new TezosBTC(
            new TezosFAProtocolOptions(
              delphinetNetwork,
              new TezosBTCProtocolConfig(undefined, undefined, undefined, undefined, 'KT1WhBK8hsji4YZtS6PwTWBAMX7cDbwtC7cZ')
            )
          )
        ]
      ]
    })

    await this.initializeTezosDomains()
  }

  private async initializeTezosDomains(): Promise<void> {
    const tezosDomainsAddresses: Record<TezosNetwork, string | undefined> = {
      [TezosNetwork.MAINNET]: undefined,
      [TezosNetwork.DELPHINET]: 'KT1CR6vXJ1qeY4ALDQfUaLFi3FcJJZ8WDygo',
      [TezosNetwork.EDONET]: 'KT1JJbWfW8CHUY95hG9iq2CEMma1RiKhMHDR'
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
