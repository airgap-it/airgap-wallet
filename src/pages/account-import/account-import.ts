import { Component } from '@angular/core'
import { NavParams, ViewController, LoadingController, Platform, NavController } from 'ionic-angular'
import { AirGapMarketWallet } from 'airgap-coin-lib'
import { AccountProvider } from '../../providers/account/account.provider'
import { handleErrorSentry, ErrorCategory } from '../../providers/sentry-error-handler/sentry-error-handler'

@Component({
  selector: 'page-account-import',
  templateUrl: 'account-import.html'
})
export class AccountImportPage {
  wallet: AirGapMarketWallet

  walletAlreadyExists = false

  constructor(
    private platform: Platform,
    private loadingCtrl: LoadingController,
    private viewCtrl: ViewController,
    private navParams: NavParams,
    private wallets: AccountProvider,
    public navCtrl: NavController
  ) {}

  ionViewWillEnter() {
    this.platform
      .ready()
      .then(() => {
        let loading = this.loadingCtrl.create({
          content: 'Syncing...'
        })

        loading.present().catch(handleErrorSentry(ErrorCategory.NAVIGATION))

        this.walletAlreadyExists = false
        this.wallet = this.navParams.get('wallet') // TODO: Catch error if wallet cannot be imported

        if (this.wallets.walletExists(this.wallet)) {
          this.wallet = this.wallets.walletByPublicKeyAndProtocolAndAddressIndex(
            this.wallet.publicKey,
            this.wallet.protocolIdentifier,
            this.wallet.addressIndex
          )
          this.walletAlreadyExists = true
          loading.dismiss().catch(handleErrorSentry(ErrorCategory.NAVIGATION))
          return
        }

        const airGapWorker = new Worker('./assets/workers/airgap-coin-lib.js')

        airGapWorker.onmessage = event => {
          this.wallet.addresses = event.data.addresses
          this.wallet
            .synchronize()
            .then(() => {
              this.wallets.triggerWalletChanged()
            })
            .catch(handleErrorSentry(ErrorCategory.WALLET_PROVIDER))
          loading.dismiss().catch(handleErrorSentry(ErrorCategory.NAVIGATION))
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
      .catch(handleErrorSentry(ErrorCategory.NAVIGATION))
  }

  async import() {
    await this.wallets.addWallet(this.wallet)
    this.viewCtrl
      .dismiss()
      .then(async v => {
        console.log('WalletImportPage dismissed')
        await this.navCtrl.popToRoot().catch(handleErrorSentry(ErrorCategory.NAVIGATION))
        const tabs = this.navCtrl.parent
        if (tabs) {
          tabs.select(0)
        }
      })
      .catch(handleErrorSentry(ErrorCategory.NAVIGATION))
  }
}
