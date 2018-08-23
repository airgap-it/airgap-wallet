import { Component } from '@angular/core'
import { NavParams, ViewController, LoadingController } from 'ionic-angular'
import { QrProvider } from '../../providers/qr/qr'
import { AirGapMarketWallet } from 'airgap-coin-lib'
import { WalletsProvider } from '../../providers/wallets/wallets.provider'

@Component({
  selector: 'page-wallet-import',
  templateUrl: 'wallet-import.html'
})
export class WalletImportPage {

  wallet: AirGapMarketWallet

  walletAlreadyExists = false

  constructor(private loadingCtrl: LoadingController, private viewCtrl: ViewController, private navParams: NavParams, private qrProvider: QrProvider, private wallets: WalletsProvider) {

  }

  ionViewWillEnter() {
    let loading = this.loadingCtrl.create({
      content: 'Syncing...'
    })

    loading.present()

    this.walletAlreadyExists = false
    if (this.navParams.get('data')) {
      this.wallet = this.qrProvider.getWalletFromData(this.navParams.get('data')) // TODO: Catch error if wallet cannot be imported

      if (this.wallets.walletExists(this.wallet)) {
        this.walletAlreadyExists = true
      }

      const airGapWorker = new Worker('./assets/workers/airgap-coin-lib.js')

      airGapWorker.onmessage = (event) => {
        this.wallet.addresses = event.data.addresses
        this.wallet.synchronize()
        loading.dismiss()
      }

      airGapWorker.postMessage({
        protocolIdentifier: this.wallet.protocolIdentifier,
        publicKey: this.wallet.publicKey,
        isExtendedPublicKey: this.wallet.isExtendedPublicKey,
        derivationPath: this.wallet.derivationPath
      })
    }
  }

  dismiss() {
    this.viewCtrl.dismiss().then(v => {
      console.log('WalletImportPage dismissed')
    }).catch(error => {
      console.warn(error)
    })
  }

  async import() {
    await this.wallets.addWallet(this.wallet)
    this.viewCtrl.dismiss().then(v => {
      console.log('WalletImportPage dismissed')
    }).catch(error => {
      console.warn(error)
    })
  }

}
