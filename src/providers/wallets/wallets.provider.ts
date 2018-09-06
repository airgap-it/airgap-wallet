import { Injectable } from '@angular/core'
import { Storage } from '@ionic/storage'
import { BehaviorSubject } from 'rxjs/BehaviorSubject'
import { AirGapMarketWallet } from 'airgap-coin-lib'

enum SettingsKeys {
  WALLET = 'wallets',
  CURRENCY = 'currency'
}

@Injectable()
export class WalletsProvider {

  private walletList: AirGapMarketWallet[] = []
  public wallets: BehaviorSubject<AirGapMarketWallet[]> = new BehaviorSubject(this.walletList)

  constructor(private storage: Storage) {
    this.storage.get(SettingsKeys.WALLET).then((rawWallets) => {
      let wallets = rawWallets

      // migrating double-serialization
      if (!(rawWallets instanceof Array)) {
        wallets = JSON.parse(rawWallets)
      }

      if (!wallets) {
        wallets = []
      }

      wallets.forEach(wallet => {
        let airGapWallet = new AirGapMarketWallet(wallet.protocolIdentifier, wallet.publicKey, wallet.isExtendedPublicKey, wallet.derivationPath)

        // if we have no addresses, derive using webworker and sync, else just sync
        if (airGapWallet.addresses.length === 0 || (airGapWallet.isExtendedPublicKey && airGapWallet.addresses.length < 20)) {
          const airGapWorker = new Worker('./assets/workers/airgap-coin-lib.js')

          airGapWorker.onmessage = (event) => {
            airGapWallet.addresses = event.data.addresses
            airGapWallet.synchronize()
          }

          airGapWorker.postMessage({
            protocolIdentifier: airGapWallet.protocolIdentifier,
            publicKey: airGapWallet.publicKey,
            isExtendedPublicKey: airGapWallet.isExtendedPublicKey,
            derivationPath: airGapWallet.derivationPath
          })
        } else {
          airGapWallet.synchronize()
        }

        this.walletList.push(airGapWallet)
      })
    })
  }

  addWallet(wallet: AirGapMarketWallet): Promise<any> {
    if (this.walletExists(wallet)) {
      throw new Error('wallet already exists')
    }

    this.walletList.push(wallet)
    return this.persist()
  }

  removeWallet(testWallet: AirGapMarketWallet): Promise<void> {
    return new Promise((resolve, reject) => {
      let index = this.walletList.findIndex(wallet => wallet.publicKey === testWallet.publicKey && wallet.protocolIdentifier === testWallet.protocolIdentifier)
      if (index > -1) {
        this.walletList.splice(index, 1)
      }
      this.persist().then(resolve)
    })
  }

  persist(): Promise<void> {
    return this.storage.set(SettingsKeys.WALLET, this.walletList)
  }

  walletExists(testWallet: AirGapMarketWallet) {
    return this.walletList.some(wallet => wallet.publicKey === testWallet.publicKey && wallet.protocolIdentifier === testWallet.protocolIdentifier)
  }

}
