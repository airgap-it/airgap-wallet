import { Injectable } from '@angular/core'
import { Storage } from '@ionic/storage'
import { BehaviorSubject } from 'rxjs/BehaviorSubject'
import { AirGapMarketWallet } from 'airgap-coin-lib'
import { SettingsProvider, SettingsKey } from '../settings/settings'
import { Subject } from 'rxjs'

@Injectable()
export class WalletsProvider {
  private walletList: AirGapMarketWallet[] = []
  public wallets: BehaviorSubject<AirGapMarketWallet[]> = new BehaviorSubject(this.walletList)
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
  }

  public addWallet(wallet: AirGapMarketWallet): Promise<any> {
    if (this.walletExists(wallet)) {
      throw new Error('wallet already exists')
    }

    this.walletList.push(wallet)
    return this.persist()
  }

  public removeWallet(testWallet: AirGapMarketWallet): Promise<void> {
    let index = this.walletList.findIndex(
      wallet => wallet.publicKey === testWallet.publicKey && wallet.protocolIdentifier === testWallet.protocolIdentifier
    )
    if (index > -1) {
      this.walletList.splice(index, 1)
    }
    return this.persist()
  }

  private async persist(): Promise<void> {
    return this.settingsProvider.set(SettingsKey.WALLET, this.walletList)
  }

  public walletExists(testWallet: AirGapMarketWallet): boolean {
    return this.walletList.some(
      wallet => wallet.publicKey === testWallet.publicKey && wallet.protocolIdentifier === testWallet.protocolIdentifier
    )
  }
}
