import { Location } from '@angular/common'
import { Component, NgZone } from '@angular/core'
import { ActivatedRoute, Router } from '@angular/router'
import { AlertController, LoadingController, ModalController, Platform } from '@ionic/angular'
import { AirGapMarketWallet } from 'airgap-coin-lib'

import { AccountProvider } from '../../services/account/account.provider'
import { ErrorCategory, handleErrorSentry } from '../../services/sentry-error-handler/sentry-error-handler'
import { WebExtensionProvider } from '../../services/web-extension/web-extension'

@Component({
  selector: 'page-account-import',
  templateUrl: 'account-import.html'
})
export class AccountImportPage {
  public wallet: AirGapMarketWallet

  public walletAlreadyExists = false

  // WebExtension
  public walletImportable = true

  public loading: HTMLIonLoadingElement

  constructor(
    private readonly platform: Platform,
    private readonly location: Location,
    private readonly loadingCtrl: LoadingController,
    private readonly viewCtrl: ModalController,
    private readonly route: ActivatedRoute,
    private readonly router: Router,
    private readonly wallets: AccountProvider,
    private readonly webExtensionProvider: WebExtensionProvider,
    private readonly alertCtrl: AlertController,
    private readonly ngZone: NgZone
  ) {
    if (this.route.snapshot.data.special) {
      this.wallet = this.route.snapshot.data.special
    }
  }

  public ionViewWillEnter() {
    this.platform
      .ready()
      .then(async () => {
        this.loading = await this.loadingCtrl.create({
          message: 'Syncing...'
        })

        this.loading.present().catch(handleErrorSentry(ErrorCategory.NAVIGATION))

        this.walletAlreadyExists = false

        if (this.wallets.walletExists(this.wallet)) {
          this.wallet = this.wallets.walletByPublicKeyAndProtocolAndAddressIndex(
            this.wallet.publicKey,
            this.wallet.protocolIdentifier,
            this.wallet.addressIndex
          )
          this.walletAlreadyExists = true
          this.loading.dismiss().catch(handleErrorSentry(ErrorCategory.NAVIGATION))

          return
        }

        // we currently only support ETH and AE for the chrome extension
        if (this.webExtensionProvider.isWebExtension()) {
          const whitelistedProtocols = ['eth', 'ae']

          this.walletImportable = whitelistedProtocols.some(
            whitelistedProtocol => this.wallet.coinProtocol.identifier === whitelistedProtocol
          )

          if (!this.walletImportable) {
            const alert = this.alertCtrl
              .create({
                header: 'Account Not Supported',
                message: 'We currently only support Ethereum and Aeternity accounts.'
              })
              .then(alert => {
                alert.present()
              })
          }
        }

        const airGapWorker = new Worker('./assets/workers/airgap-coin-lib.js')

        airGapWorker.onmessage = event => {
          this.wallet.addresses = event.data.addresses
          this.wallet
            .synchronize()
            .then(() => {
              this.ngZone.run(() => {
                this.wallets.triggerWalletChanged()
              })
            })
            .catch(handleErrorSentry(ErrorCategory.WALLET_PROVIDER))
          this.loading.dismiss().catch(handleErrorSentry(ErrorCategory.NAVIGATION))
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

  public dismiss() {
    this.location.back()
  }

  public async import() {
    await this.wallets.addWallet(this.wallet)
    await this.router.navigateByUrl('/tabs/portfolio')
  }
}
