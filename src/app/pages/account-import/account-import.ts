import { Component, NgZone } from '@angular/core'
import { ActivatedRoute, Router } from '@angular/router'
import { LoadingController, NavController, Platform } from '@ionic/angular'
import { AirGapMarketWallet } from 'airgap-coin-lib'
import { DataService } from 'src/app/services/data/data.service'

import { AccountProvider } from '../../services/account/account.provider'
import { ErrorCategory, handleErrorSentry } from '../../services/sentry-error-handler/sentry-error-handler'

@Component({
  selector: 'page-account-import',
  templateUrl: 'account-import.html'
})
export class AccountImportPage {
  public wallet: AirGapMarketWallet

  public walletAlreadyExists: boolean = false

  public loading: HTMLIonLoadingElement

  constructor(
    private readonly platform: Platform,
    private readonly loadingCtrl: LoadingController,
    private readonly navController: NavController,
    private readonly route: ActivatedRoute,
    private readonly router: Router,
    private readonly wallets: AccountProvider,
    private readonly dataService: DataService,
    private readonly ngZone: NgZone
  ) {
    if (!this.route.snapshot.data.special) {
      this.router.navigateByUrl('/')
      window.alert("The address you're trying to access is invalid.")
      throw new Error()
    }
  }

  public async ionViewWillEnter(): Promise<void> {
    if (this.route.snapshot.data.special) {
      this.dataService.getImportWallet().subscribe(wallet => {
        this.wallet = wallet
        this.ionViewDidEnter()
      })
    }

    await this.platform.ready()

    this.loading = await this.loadingCtrl.create({
      message: 'Syncing...'
    })

    this.loading.present().catch(handleErrorSentry(ErrorCategory.NAVIGATION))

    this.walletAlreadyExists = false
  }

  public async ionViewDidEnter(): Promise<void> {
    if (this.wallets.walletExists(this.wallet)) {
      this.wallet = this.wallets.walletByPublicKeyAndProtocolAndAddressIndex(
        this.wallet.publicKey,
        this.wallet.protocol.identifier,
        this.wallet.addressIndex
      )
      this.walletAlreadyExists = true
      this.loading.dismiss().catch(handleErrorSentry(ErrorCategory.NAVIGATION))

      return
    }

    const airGapWorker: Worker = new Worker('./assets/workers/airgap-coin-lib.js')

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
      protocolIdentifier: this.wallet.protocol.identifier,
      publicKey: this.wallet.publicKey,
      isExtendedPublicKey: this.wallet.isExtendedPublicKey,
      derivationPath: this.wallet.derivationPath
    })
  }

  public async dismiss(): Promise<void> {
    this.navController.back()
  }

  public async import(): Promise<void> {
    await this.wallets.addWallet(this.wallet)
    await this.router.navigateByUrl('/tabs/portfolio', { skipLocationChange: true })
  }
}
