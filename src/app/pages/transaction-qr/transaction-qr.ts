import { IAirGapTransaction } from '@airgap/coinlib-core'
import { IACMessageDefinitionObjectV3 } from '@airgap/serializer'
import { Component } from '@angular/core'
import { ActivatedRoute, Router } from '@angular/router'
import { Platform } from '@ionic/angular'
import BigNumber from 'bignumber.js'

import { ErrorCategory, handleErrorSentry } from '../../services/sentry-error-handler/sentry-error-handler'

@Component({
  selector: 'page-transaction-qr',
  templateUrl: 'transaction-qr.html'
})
export class TransactionQrPage {
  public messageDefinitionObjects: IACMessageDefinitionObjectV3[] = []
  public airGapTxs: IAirGapTransaction[] = null
  public isBrowser: boolean = false
  public qrDataTooBig: boolean = false
  public interactionData: any

  public aggregatedInfo:
    | {
        numberOfTxs: number
        totalAmount: BigNumber
        totalFees: BigNumber
      }
    | undefined

  constructor(private readonly router: Router, private readonly route: ActivatedRoute, private readonly platform: Platform) {
    if (this.route.snapshot.data.special) {
      const info = this.route.snapshot.data.special
      this.airGapTxs = info.airGapTxs
      this.interactionData = info.interactionData
      this.messageDefinitionObjects = info.data
      this.qrDataTooBig = this.messageDefinitionObjects.length > 2800

      if (
        this.airGapTxs &&
        this.airGapTxs.length > 1 &&
        this.airGapTxs.every((tx: IAirGapTransaction) => tx.protocolIdentifier === this.airGapTxs[0].protocolIdentifier)
      ) {
        this.aggregatedInfo = {
          numberOfTxs: this.airGapTxs.length,
          totalAmount: this.airGapTxs
            .map((tx: IAirGapTransaction) => new BigNumber(tx.amount))
            .filter((amount: BigNumber) => !amount.isNaN())
            .reduce((pv: BigNumber, cv: BigNumber) => pv.plus(cv), new BigNumber(0)),
          totalFees: this.airGapTxs.reduce((pv: BigNumber, cv: IAirGapTransaction) => pv.plus(cv.fee), new BigNumber(0))
        }
      }
    }
    this.isBrowser = !this.platform.is('hybrid')
  }

  public scanQr() {
    this.router.navigateByUrl('/tabs/scan').catch(handleErrorSentry(ErrorCategory.NAVIGATION))
  }

  public done() {
    this.router.navigateByUrl('/tabs/portfolio').catch(handleErrorSentry(ErrorCategory.NAVIGATION))
  }
}
