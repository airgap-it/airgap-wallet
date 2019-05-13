import { Component } from '@angular/core'
import { ActivatedRoute, Router } from '@angular/router'
import { Platform } from '@ionic/angular'
import { AirGapMarketWallet } from 'airgap-coin-lib'

import { Transaction } from '../../models/transaction.model'
import { DeepLinkProvider } from '../../services/deep-link/deep-link'
import { ErrorCategory, handleErrorSentry } from '../../services/sentry-error-handler/sentry-error-handler'

@Component({
  selector: 'page-transaction-qr',
  templateUrl: 'transaction-qr.html'
})
export class TransactionQrPage {
  public preparedDataQR: string = ''
  public wallet: AirGapMarketWallet = null
  public airGapTx: Transaction = null
  public isBrowser: boolean = false
  public qrDataTooBig: boolean = false

  constructor(
    private readonly router: Router,
    private readonly route: ActivatedRoute,
    private readonly platform: Platform,
    private readonly deeplinkProvider: DeepLinkProvider
  ) {
    if (this.route.snapshot.data.special) {
      const info = this.route.snapshot.data.special
      this.wallet = info.wallet
      this.airGapTx = info.airGapTx
      this.preparedDataQR = info.data
      this.qrDataTooBig = this.preparedDataQR.length > 2800
    }
    this.isBrowser = !this.platform.is('cordova')
  }

  public done() {
    this.router.navigateByUrl('/tabs/portfolio').catch(handleErrorSentry(ErrorCategory.NAVIGATION))
  }

  public sameDeviceSign() {
    this.deeplinkProvider.sameDeviceDeeplink(this.preparedDataQR)
  }
}
