import { Injectable } from '@angular/core'
import { Router } from '@angular/router'
import { PushNotification } from '@capacitor/core'
import { AlertController, LoadingController, PopoverController, ToastController } from '@ionic/angular'
import { AirGapMarketWallet, getProtocolByIdentifier, ICoinProtocol, supportedProtocols, TezosProtocol } from 'airgap-coin-lib'
import { TezosProtocolNetwork, TezosProtocolOptions } from 'airgap-coin-lib/dist/protocols/tezos/TezosProtocolOptions'
import { ProtocolSymbols } from 'airgap-coin-lib/dist/utils/ProtocolSymbols'
import { ReplaySubject, Subject } from 'rxjs'
import { auditTime, map, take } from 'rxjs/operators'
import { isType } from 'src/app/utils/utils'

import { DelegateAlertAction } from '../../models/actions/DelegateAlertAction'
import { AirGapTipUsAction } from '../../models/actions/TipUsAction'
import { DataService } from '../data/data.service'
import { DrawChartService } from '../draw-chart/draw-chart.service'
import { LanguageService } from '../language/language.service'
import { OperationsProvider } from '../operations/operations'
import { PushProvider } from '../push/push'
import { ErrorCategory, handleErrorSentry } from '../sentry-error-handler/sentry-error-handler'
import { SettingsKey, StorageProvider } from '../storage/storage'

enum NotificationKind {
  CTA_Tip = 'cta_tip',
  CTA_Delegate = 'cta_delegate'
}

interface CTAInfo {
  kind: NotificationKind
  fromAddress: string
  toAddress: string
  amount: string
  alertTitle: string
  alertDescription: string
}

export const getProtocolByIdentifierAndNetworkIdentifier = (
  targetProtocolIdentifier: ProtocolSymbols,
  networkIdentifier: string
): ICoinProtocol => {
  const filteredProtocol: ICoinProtocol | undefined = supportedProtocols().find(
    (protocol: ICoinProtocol) =>
      protocol.identifier === targetProtocolIdentifier && (!networkIdentifier || protocol.options.network.identifier === networkIdentifier)
  )
  if (filteredProtocol) {
    return filteredProtocol
  } else {
    // TODO: Get for the right network
    return getProtocolByIdentifier(targetProtocolIdentifier)
  }

  // throw new Error(`No protocol found ${targetProtocolIdentifier} ${networkIdentifier}`)
}

@Injectable({
  providedIn: 'root'
})
export class AccountProvider {
  private readonly walletList: AirGapMarketWallet[] = []
  public activeAccountSubject: ReplaySubject<AirGapMarketWallet> = new ReplaySubject(1)
  public walletsHaveLoaded: ReplaySubject<boolean> = new ReplaySubject(1)

  public refreshPageSubject: Subject<void> = new Subject()

  private activeAccount: AirGapMarketWallet

  public wallets: ReplaySubject<AirGapMarketWallet[]> = new ReplaySubject(1)
  public subWallets: ReplaySubject<AirGapMarketWallet[]> = new ReplaySubject(1)
  public usedProtocols: ReplaySubject<ICoinProtocol[]> = new ReplaySubject(1)

  private readonly walletChangedBehaviour: Subject<void> = new Subject()

  get walletChangedObservable() {
    return this.walletChangedBehaviour.asObservable().pipe(auditTime(50))
  }

  constructor(
    private readonly storageProvider: StorageProvider,
    private readonly pushProvider: PushProvider,
    private readonly drawChartProvider: DrawChartService,
    private readonly popoverController: PopoverController,
    private readonly languageService: LanguageService,
    private readonly alertController: AlertController,
    private readonly toastController: ToastController,
    private readonly loadingController: LoadingController,
    private readonly opertaionsProvider: OperationsProvider,
    private readonly dataService: DataService,
    private readonly router: Router
  ) {
    this.loadWalletsFromStorage()
      .then(() => {
        this.walletsHaveLoaded.next(true)
      })
      .catch(console.error)
    this.loadActiveAccountFromStorage().catch(console.error)
    this.wallets.pipe(map(wallets => wallets.filter(wallet => 'subProtocolType' in wallet.protocol))).subscribe(this.subWallets)
    this.wallets.pipe(map(wallets => this.getProtocolsFromWallets(wallets))).subscribe(this.usedProtocols)

    this.pushProvider.notificationCallback = (notification: PushNotification): void => {
      // We need a timeout because otherwise routing might fail

      const env = {
        popoverController: this.popoverController,
        loadingController: this.loadingController,
        languageService: this.languageService,
        alertController: this.alertController,
        toastController: this.toastController,
        operationsProvider: this.opertaionsProvider,
        dataService: this.dataService,
        router: this.router
      }

      if (notification && isType<CTAInfo>(notification.data)) {
        const tippingInfo: CTAInfo = notification.data

        if (tippingInfo.kind === NotificationKind.CTA_Tip) {
          const originWallet: AirGapMarketWallet = this.getWalletList().find((wallet: AirGapMarketWallet) =>
            wallet.addresses.some((address: string) => address === tippingInfo.fromAddress)
          )
          setTimeout(() => {
            const tipAction: AirGapTipUsAction = new AirGapTipUsAction({
              wallet: originWallet,
              tipAddress: tippingInfo.toAddress,
              amount: tippingInfo.amount,
              alertTitle: tippingInfo.alertTitle,
              alertDescription: tippingInfo.alertDescription,
              ...env
            })

            tipAction.start()
          }, 3500)
        }

        if (tippingInfo.kind === NotificationKind.CTA_Delegate) {
          const originWallet: AirGapMarketWallet = this.getWalletList().find((wallet: AirGapMarketWallet) =>
            wallet.addresses.some((address: string) => address === tippingInfo.fromAddress)
          )
          setTimeout(() => {
            const delegateAlertAction: DelegateAlertAction = new DelegateAlertAction({
              wallet: originWallet,
              delegate: tippingInfo.toAddress,
              alertTitle: tippingInfo.alertTitle,
              alertDescription: tippingInfo.alertDescription,
              ...env
            })

            delegateAlertAction.start()
          }, 3500)
        }
      }
    }
  }

  public triggerWalletChanged() {
    this.walletChangedBehaviour.next()
  }

  private getProtocolsFromWallets(wallets: AirGapMarketWallet[]) {
    const protocols: Map<string, ICoinProtocol> = new Map()
    wallets.forEach(wallet => {
      if (!protocols.has(wallet.protocol.identifier)) {
        protocols.set(wallet.protocol.identifier, wallet.protocol)
      }
    })

    return Array.from(protocols.values())
  }

  private async loadWalletsFromStorage() {
    const rawWallets = await this.storageProvider.get(SettingsKey.WALLET)

    let wallets = rawWallets || []

    // migrating double-serialization
    if (!(rawWallets instanceof Array)) {
      try {
        wallets = JSON.parse(rawWallets)
      } catch (e) {
        wallets = []
      }
    }

    // "wallets" can be undefined here
    if (!wallets) {
      wallets = []
    }

    const walletInitPromises: Promise<void>[] = []

    wallets.forEach(wallet => {
      const protocol = getProtocolByIdentifierAndNetworkIdentifier(wallet.protocolIdentifier, wallet.networkIdentifier)

      const airGapWallet = new AirGapMarketWallet(
        protocol,
        wallet.publicKey,
        wallet.isExtendedPublicKey,
        wallet.derivationPath,
        wallet.addressIndex
      )
      // add derived addresses
      airGapWallet.addresses = wallet.addresses
      walletInitPromises.push(this.initializeWallet(airGapWallet))
      this.walletList.push(airGapWallet)
    })

    Promise.all(walletInitPromises).then(() => {
      this.triggerWalletChanged()
      this.drawChartProvider.drawChart()
    })

    /* Use for Testing of Skeleton
    await new Promise(resolve => {
      setTimeout(() => {
        resolve()
      }, 2000)
    })
    */

    if (this.walletList.length > 0) {
      this.pushProvider.setupPush()
    }

    this.wallets.next(this.walletList)
    this.pushProvider.registerWallets(this.walletList)
  }

  private async initializeWallet(airGapWallet: AirGapMarketWallet): Promise<void> {
    return new Promise<void>(resolve => {
      // if we have no addresses, derive using webworker and sync, else just sync
      if (airGapWallet.addresses.length === 0 || (airGapWallet.isExtendedPublicKey && airGapWallet.addresses.length < 20)) {
        const airGapWorker = new Worker('./assets/workers/airgap-coin-lib.js')

        airGapWorker.onmessage = event => {
          airGapWallet.addresses = event.data.addresses
          airGapWallet
            .synchronize()
            .then(() => {
              resolve()
            })
            .catch(error => {
              console.error(error)
              resolve()
            })
        }

        airGapWorker.postMessage({
          protocolIdentifier: airGapWallet.protocol.identifier,
          publicKey: airGapWallet.publicKey,
          isExtendedPublicKey: airGapWallet.isExtendedPublicKey,
          derivationPath: airGapWallet.derivationPath,
          addressIndex: airGapWallet.addressIndex
        })
      } else {
        airGapWallet
          .synchronize()
          .then(() => {
            resolve()
          })
          .catch(error => {
            console.error(error)
            resolve()
          })
      }
    })
  }

  public getWalletList(): AirGapMarketWallet[] {
    return this.walletList
  }

  public async addWallet(wallet: AirGapMarketWallet): Promise<void> {
    if (this.walletExists(wallet)) {
      throw new Error('wallet already exists')
    }

    // WebExtension: Add as active wallet if it's the first wallet
    if (this.walletList.length === 0) {
      this.changeActiveAccount(wallet)
    }

    // Register address with push backend
    this.pushProvider.setupPush()
    this.pushProvider.registerWallets([wallet]).catch(handleErrorSentry(ErrorCategory.PUSH))

    this.walletList.push(wallet)

    this.wallets.next(this.walletList)
    this.drawChartProvider.drawChart()

    return this.persist()
  }

  public removeWallet(walletToRemove: AirGapMarketWallet): Promise<void> {
    const index = this.walletList.findIndex(wallet => this.isSameWallet(wallet, walletToRemove))
    if (index > -1) {
      this.walletList.splice(index, 1)
    }
    if (this.isSameWallet(walletToRemove, this.getActiveAccount())) {
      if (this.walletList.length > 0) {
        this.changeActiveAccount(this.walletList[0])
      } else if (this.walletList.length === 0) {
        this.resetActiveAccount()
      }
    }

    // Unregister address from push backend
    this.pushProvider.unregisterWallets([walletToRemove]).catch(handleErrorSentry(ErrorCategory.PUSH))

    this.wallets.next(this.walletList)
    this.drawChartProvider.drawChart()

    return this.persist()
  }

  public async setWalletNetwork(wallet: AirGapMarketWallet, network: TezosProtocolNetwork): Promise<void> {
    await wallet.setProtocol(new TezosProtocol(new TezosProtocolOptions(network)))

    await this.persist()

    this.triggerWalletChanged()
  }

  private async persist(): Promise<void> {
    return this.storageProvider.set(SettingsKey.WALLET, this.walletList.map((wallet: AirGapMarketWallet) => wallet.toJSON()))
  }

  public getAccountIdentifier(wallet: AirGapMarketWallet): string {
    return wallet.addressIndex
      ? `${wallet.protocol.identifier}-${wallet.publicKey}-${wallet.protocol.options.network.identifier}-${wallet.addressIndex}`
      : `${wallet.protocol.identifier}-${wallet.publicKey}-${wallet.protocol.options.network.identifier}`
  }

  public walletByPublicKeyAndProtocolAndAddressIndex(
    publicKey: string,
    protocolIdentifier: string,
    addressIndex?: number
  ): AirGapMarketWallet {
    return this.walletList.find(
      wallet => wallet.publicKey === publicKey && wallet.protocol.identifier === protocolIdentifier && wallet.addressIndex === addressIndex
    )
  }

  public walletExists(testWallet: AirGapMarketWallet): boolean {
    return this.walletList.some(wallet => this.isSameWallet(wallet, testWallet))
  }

  public isSameWallet(wallet1: AirGapMarketWallet, wallet2: AirGapMarketWallet) {
    if (!(wallet1 instanceof AirGapMarketWallet) || !(wallet2 instanceof AirGapMarketWallet)) {
      return false
    }

    return (
      wallet1.publicKey === wallet2.publicKey &&
      wallet1.protocol.identifier === wallet2.protocol.identifier &&
      wallet1.addressIndex === wallet2.addressIndex
    )
  }

  public async getCompatibleAndIncompatibleWalletsForAddress(
    address: string
  ): Promise<{
    compatibleWallets: AirGapMarketWallet[]
    incompatibleWallets: AirGapMarketWallet[]
  }> {
    return this.usedProtocols
      .pipe(
        take(1),
        map(protocols => {
          const compatibleProtocols: Map<string, ICoinProtocol> = new Map()

          protocols.forEach(protocol => {
            const match = address.match(protocol.addressValidationPattern)
            if (match && match.length > 0) {
              compatibleProtocols.set(protocol.identifier, protocol)
            }
          })

          const compatibleWallets: AirGapMarketWallet[] = []
          const incompatibleWallets: AirGapMarketWallet[] = []

          this.walletList.forEach(wallet => {
            if (compatibleProtocols.has(wallet.protocol.identifier)) {
              compatibleWallets.push(wallet)
            } else {
              incompatibleWallets.push(wallet)
            }
          })

          return {
            compatibleWallets,
            incompatibleWallets
          }
        })
      )
      .toPromise()
  }

  private async loadActiveAccountFromStorage() {
    const wallet = await this.storageProvider.get(SettingsKey.SELECTED_ACCOUNT)
    this.activeAccount = wallet
    this.persistActiveAccount()
    this.publishActiveAccount(wallet)
  }

  public changeActiveAccount(wallet: AirGapMarketWallet) {
    this.activeAccount = wallet
    this.persistActiveAccount()
    this.publishActiveAccount(wallet)
    this.refreshPage()
  }

  private publishActiveAccount(wallet: AirGapMarketWallet) {
    this.activeAccountSubject.next(wallet)
  }

  private refreshPage() {
    this.refreshPageSubject.next()
  }

  public getActiveAccount(): AirGapMarketWallet | undefined {
    return this.activeAccount
  }

  public resetActiveAccount() {
    this.activeAccount = undefined
    this.persistActiveAccount()
    this.refreshPage()
  }

  private async persistActiveAccount(): Promise<void> {
    return this.storageProvider.set(SettingsKey.SELECTED_ACCOUNT, this.activeAccount)
  }
}
