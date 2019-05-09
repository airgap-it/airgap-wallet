import { Injectable } from '@angular/core'
import { AirGapMarketWallet, ICoinProtocol } from 'airgap-coin-lib'
import { ReplaySubject, Subject } from 'rxjs'
import { auditTime, map, take } from 'rxjs/operators'

import { PushProvider } from '../push/push'
import { ErrorCategory, handleErrorSentry } from '../sentry-error-handler/sentry-error-handler'
import { SettingsKey, StorageProvider } from '../storage/storage'

@Injectable({
  providedIn: 'root'
})
export class AccountProvider {
  private readonly walletList: AirGapMarketWallet[] = []
  public activeAccountSubject: ReplaySubject<AirGapMarketWallet> = new ReplaySubject(1)
  public refreshPageSubject: Subject<void> = new Subject()

  private activeAccount: AirGapMarketWallet

  public wallets: ReplaySubject<AirGapMarketWallet[]> = new ReplaySubject(1)
  public subWallets: ReplaySubject<AirGapMarketWallet[]> = new ReplaySubject(1)
  public usedProtocols: ReplaySubject<ICoinProtocol[]> = new ReplaySubject(1)

  private readonly walletChangedBehaviour: Subject<void> = new Subject()

  get walledChangedObservable() {
    return this.walletChangedBehaviour.asObservable().pipe(auditTime(50))
  }

  constructor(private readonly storageProvider: StorageProvider, private readonly pushProvider: PushProvider) {
    this.loadWalletsFromStorage().catch(console.error)
    this.loadActiveAccountFromStorage().catch(console.error)
    this.wallets.pipe(map(wallets => wallets.filter(wallet => 'subProtocolType' in wallet.coinProtocol))).subscribe(this.subWallets)
    this.wallets.pipe(map(wallets => this.getProtocolsFromWallets(wallets))).subscribe(this.usedProtocols)
  }

  public triggerWalletChanged() {
    this.walletChangedBehaviour.next()
  }

  private getProtocolsFromWallets(wallets: AirGapMarketWallet[]) {
    const protocols: Map<string, ICoinProtocol> = new Map()
    wallets.forEach(wallet => {
      if (!protocols.has(wallet.protocolIdentifier)) {
        protocols.set(wallet.protocolIdentifier, wallet.coinProtocol)
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

    wallets.forEach(wallet => {
      const airGapWallet = new AirGapMarketWallet(
        wallet.protocolIdentifier,
        wallet.publicKey,
        wallet.isExtendedPublicKey,
        wallet.derivationPath,
        wallet.addressIndex
      )

      // add derived addresses
      airGapWallet.addresses = wallet.addresses

      // if we have no addresses, derive using webworker and sync, else just sync
      if (airGapWallet.addresses.length === 0 || (airGapWallet.isExtendedPublicKey && airGapWallet.addresses.length < 20)) {
        const airGapWorker = new Worker('./assets/workers/airgap-coin-lib.js')

        airGapWorker.onmessage = event => {
          airGapWallet.addresses = event.data.addresses
          airGapWallet
            .synchronize()
            .then(() => {
              this.triggerWalletChanged()
            })
            .catch(console.error)
        }

        airGapWorker.postMessage({
          protocolIdentifier: airGapWallet.protocolIdentifier,
          publicKey: airGapWallet.publicKey,
          isExtendedPublicKey: airGapWallet.isExtendedPublicKey,
          derivationPath: airGapWallet.derivationPath,
          addressIndex: airGapWallet.addressIndex
        })
      } else {
        airGapWallet
          .synchronize()
          .then(() => {
            this.triggerWalletChanged()
          })
          .catch(console.error)
      }

      this.walletList.push(airGapWallet)
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

    return this.persist()
  }

  private async persist(): Promise<void> {
    return this.storageProvider.set(SettingsKey.WALLET, this.walletList)
  }

  public getAccountIdentifier(wallet: AirGapMarketWallet): string {
    return wallet.addressIndex
      ? `${wallet.protocolIdentifier}-${wallet.publicKey}-${wallet.addressIndex}`
      : `${wallet.protocolIdentifier}-${wallet.publicKey}`
  }

  public walletByPublicKeyAndProtocolAndAddressIndex(
    publicKey: string,
    protocolIdentifier: string,
    addressIndex?: number
  ): AirGapMarketWallet {
    return this.walletList.find(
      wallet => wallet.publicKey === publicKey && wallet.protocolIdentifier === protocolIdentifier && wallet.addressIndex === addressIndex
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
      wallet1.protocolIdentifier === wallet2.protocolIdentifier &&
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
            if (compatibleProtocols.has(wallet.protocolIdentifier)) {
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
