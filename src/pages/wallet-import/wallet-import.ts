import { Component } from '@angular/core'
import { NavParams, ViewController, LoadingController, Platform } from 'ionic-angular'
import { AirGapMarketWallet } from 'airgap-coin-lib'
import { WalletsProvider } from '../../providers/wallets/wallets.provider'

@Component({
  selector: 'page-wallet-import',
  templateUrl: 'wallet-import.html'
})
export class WalletImportPage {
  wallet: AirGapMarketWallet

  walletAlreadyExists = false

  constructor(
    private platform: Platform,
    private loadingCtrl: LoadingController,
    private viewCtrl: ViewController,
    private navParams: NavParams,
    private wallets: WalletsProvider
  ) {}

  ionViewWillEnter() {
    this.platform
      .ready()
      .then(() => {
        let loading = this.loadingCtrl.create({
          content: 'Syncing...'
        })

        loading.present().catch(console.error)

        this.walletAlreadyExists = false
        this.wallet = this.navParams.get('wallet') // TODO: Catch error if wallet cannot be imported

        if (this.wallets.walletExists(this.wallet)) {
          this.walletAlreadyExists = true
        }

        const airGapWorker = new Worker('./assets/workers/airgap-coin-lib.js')

        airGapWorker.onmessage = event => {
          this.wallet.addresses = event.data.addresses
          this.wallet.synchronize().then(() => {
            this.wallets.triggerWalletChanged()
          })
          loading.dismiss()
        }

        airGapWorker.postMessage({
          protocolIdentifier: this.wallet.protocolIdentifier,
          publicKey: this.wallet.publicKey,
          isExtendedPublicKey: this.wallet.isExtendedPublicKey,
          derivationPath: this.wallet.derivationPath
        })
      })
      .catch(console.error)
  }

  dismiss() {
    this.viewCtrl
      .dismiss()
      .then(v => {
        console.log('WalletImportPage dismissed')
      })
      .catch(error => {
        console.warn(error)
      })
  }

  async import() {
    await this.wallets.addWallet(this.wallet)
    this.viewCtrl
      .dismiss()
      .then(v => {
        console.log('WalletImportPage dismissed')
      })
      .catch(error => {
        console.warn(error)
      })
  }
}
