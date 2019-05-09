import { Component } from '@angular/core'
import { ActivatedRoute, Router } from '@angular/router'
import { AirGapMarketWallet, IAirGapTransaction } from 'airgap-coin-lib'

import { DataService, DataServiceKey } from '../../services/data/data.service'
import { DeepLinkProvider } from '../../services/deep-link/deep-link'
import { ErrorCategory, handleErrorSentry } from '../../services/sentry-error-handler/sentry-error-handler'

@Component({
  selector: 'page-interaction-selection',
  templateUrl: 'interaction-selection.html',
  styleUrls: ['./interaction-selection.scss']
})
export class InteractionSelectionPage {
  public preparedDataQR: string = ''
  private readonly wallet: AirGapMarketWallet
  private readonly airGapTx: IAirGapTransaction

  constructor(
    private readonly router: Router,
    private readonly route: ActivatedRoute,
    private readonly deepLinkProvider: DeepLinkProvider,
    private readonly dataService: DataService
  ) {
    if (this.route.snapshot.data.special) {
      const info = this.route.snapshot.data.special
      this.wallet = info.wallet
      this.airGapTx = info.airGapTx
      this.preparedDataQR = info.data
    }
  }

  public async ionViewDidEnter() {}

  public offlineDeviceSign() {
    const info = {
      wallet: this.wallet,
      airGapTx: this.airGapTx,
      data: this.preparedDataQR
    }
    this.dataService.setData(DataServiceKey.TRANSACTION, info)
    this.router.navigateByUrl('/transaction-qr/' + DataServiceKey.TRANSACTION).catch(handleErrorSentry(ErrorCategory.NAVIGATION))
  }

  public sameDeviceSign() {
    this.deepLinkProvider
      .sameDeviceDeeplink(this.preparedDataQR)
      .then(() => {
        this.router.navigateByUrl('/tabs/portfolio').catch(handleErrorSentry(ErrorCategory.NAVIGATION))
      })
      .catch(handleErrorSentry(ErrorCategory.DEEPLINK_PROVIDER))
  }
}
