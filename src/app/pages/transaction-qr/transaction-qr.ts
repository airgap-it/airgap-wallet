import { Component } from '@angular/core'
import { ActivatedRoute, Router } from '@angular/router'
import { Platform } from '@ionic/angular'
import { AirGapMarketWallet, IAirGapTransaction } from 'airgap-coin-lib'
import BigNumber from 'bignumber.js'

import { DeepLinkProvider } from '../../services/deep-link/deep-link'
import { ErrorCategory, handleErrorSentry } from '../../services/sentry-error-handler/sentry-error-handler'

@Component({
  selector: 'page-transaction-qr',
  templateUrl: 'transaction-qr.html'
})
export class TransactionQrPage {
  public preparedDataQR: string = ''
  public wallet: AirGapMarketWallet = null
  public airGapTxs: IAirGapTransaction[] = null
  public isBrowser: boolean = false
  public qrDataTooBig: boolean = false
  public aggregatedInfo:
    | {
        numberOfTxs: number
        totalAmount: BigNumber
        totalFees: BigNumber
      }
    | undefined

  constructor(
    private readonly router: Router,
    private readonly route: ActivatedRoute,
    private readonly platform: Platform,
    private readonly deeplinkProvider: DeepLinkProvider
  ) {
    if (this.route.snapshot.data.special) {
      const info = this.route.snapshot.data.special
      this.wallet = info.wallet
      this.airGapTxs = info.airGapTxs
      this.preparedDataQR = info.data
      this.qrDataTooBig = this.preparedDataQR.length > 2800

      if (
        this.airGapTxs.length > 1 &&
        this.airGapTxs.every((tx: IAirGapTransaction) => tx.protocolIdentifier === this.airGapTxs[0].protocolIdentifier)
      ) {
        this.aggregatedInfo = {
          numberOfTxs: this.airGapTxs.length,
          totalAmount: this.airGapTxs.reduce((pv: BigNumber, cv: IAirGapTransaction) => pv.plus(cv.amount), new BigNumber(0)),
          totalFees: this.airGapTxs.reduce((pv: BigNumber, cv: IAirGapTransaction) => pv.plus(cv.fee), new BigNumber(0))
        }
      }
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
