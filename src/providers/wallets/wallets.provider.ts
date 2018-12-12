import { Injectable } from '@angular/core'
import { Storage } from '@ionic/storage'
import { Subject, ReplaySubject, BehaviorSubject } from 'rxjs'
import { AirGapMarketWallet } from 'airgap-coin-lib'
import { SettingsProvider, SettingsKey } from '../settings/settings'

@Injectable()
export class WalletsProvider {
  private walletList: AirGapMarketWallet[] = []

  public wallets: ReplaySubject<AirGapMarketWallet[]> = new ReplaySubject(1)
  private walletChangedBehaviour: Subject<void> = new Subject()

  get walledChangedObservable() {
    return this.walletChangedBehaviour.asObservable().auditTime(50)
  }

  constructor(private settingsProvider: SettingsProvider) {
    this.loadWalletsFromStorage().catch(console.error)
  }

  public triggerWalletChanged() {
    this.walletChangedBehaviour.next()
  }

  private async loadWalletsFromStorage() {
    await new Promise(resolve => {
      setTimeout(() => {
        resolve()
      }, 2000)
    })
    const rawWallets = await this.settingsProvider.get(SettingsKey.WALLET)
    let wallets = rawWallets

    // migrating double-serialization
    if (!(rawWallets instanceof Array)) {
      wallets = JSON.parse(rawWallets)
    }

    // "wallets" can be undefined here
    if (!wallets) {
      wallets = []
    }

    wallets.forEach(wallet => {
      let airGapWallet = new AirGapMarketWallet(
        wallet.protocolIdentifier,
        wallet.publicKey,
        wallet.isExtendedPublicKey,
        wallet.derivationPath
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
          derivationPath: airGapWallet.derivationPath
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

    this.wallets.next(this.walletList)
  }

  getWalletList(): AirGapMarketWallet[] {
    return this.walletList
  }

  public addWallet(wallet: AirGapMarketWallet): Promise<any> {
    if (this.walletExists(wallet)) {
      throw new Error('wallet already exists')
    }

    this.walletList.push(wallet)
    this.wallets.next(this.walletList)
    return this.persist()
  }

  public removeWallet(testWallet: AirGapMarketWallet): Promise<void> {
    let index = this.walletList.findIndex(
      wallet => wallet.publicKey === testWallet.publicKey && wallet.protocolIdentifier === testWallet.protocolIdentifier
    )
    if (index > -1) {
      this.walletList.splice(index, 1)
    }

    this.wallets.next(this.walletList)
    return this.persist()
  }

  private async persist(): Promise<void> {
    return this.settingsProvider.set(SettingsKey.WALLET, this.walletList)
  }

  public walletByPublicKeyAndProtocol(publicKey: string, protocolIdentifier: string): AirGapMarketWallet {
    return this.walletList.find(wallet => wallet.publicKey === publicKey && wallet.protocolIdentifier === protocolIdentifier)
  }

  public walletExists(testWallet: AirGapMarketWallet): boolean {
    return this.walletList.some(
      wallet => wallet.publicKey === testWallet.publicKey && wallet.protocolIdentifier === testWallet.protocolIdentifier
    )
  }
}
