import { Component } from '@angular/core'
import { NavParams, ViewController, LoadingController, Platform, NavController, AlertController } from 'ionic-angular'
import { AirGapMarketWallet } from 'airgap-coin-lib'
import { AccountProvider } from '../../providers/account/account.provider'
import { handleErrorSentry, ErrorCategory } from '../../providers/sentry-error-handler/sentry-error-handler'
import { WebExtensionProvider } from '../../providers/web-extension/web-extension'

@Component({
  selector: 'page-account-import',
  templateUrl: 'account-import.html'
})
export class AccountImportPage {
  wallet: AirGapMarketWallet

  walletAlreadyExists = false

  // WebExtension
  walletImportable = true

  constructor(
    private platform: Platform,
    private loadingCtrl: LoadingController,
    private viewCtrl: ViewController,
    private navParams: NavParams,
    private wallets: AccountProvider,
    public navCtrl: NavController,
    private webExtensionProvider: WebExtensionProvider,
    private alertCtrl: AlertController
  ) {}

  ionViewWillEnter() {
    this.platform
      .ready()
      .then(() => {
        const loading = this.loadingCtrl.create({
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

        // we currently only support ETH and AE for the chrome extension
        if (this.webExtensionProvider.isWebExtension()) {
          const whitelistedProtocols = ['eth', 'ae']

          this.walletImportable = whitelistedProtocols.some(
            whitelistedProtocol => this.wallet.coinProtocol.identifier === whitelistedProtocol
          )

          if (!this.walletImportable) {
            let alert = this.alertCtrl.create({
              title: 'Account Not Supported',
              message: 'We currently only support Ethereum and Aeternity accounts.'
            })
            alert.present()
          }
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
