import { Component } from '@angular/core'
import { ActivatedRoute, Router } from '@angular/router'
import { AirGapMarketWallet, IAirGapTransaction } from 'airgap-coin-lib'

import { DataService, DataServiceKey } from '../../services/data/data.service'
import { DeepLinkProvider } from '../../services/deep-link/deep-link'
import { ErrorCategory, handleErrorSentry } from '../../services/sentry-error-handler/sentry-error-handler'
import { Platform } from '@ionic/angular'
import { OperationsProvider } from 'src/app/services/operations/operations'
import { isString } from 'util'

@Component({
  selector: 'page-interaction-selection',
  templateUrl: 'interaction-selection.html',
  styleUrls: ['./interaction-selection.scss']
})
export class InteractionSelectionPage {
  public isDesktop: boolean = false

  public interactionData: any
  private readonly wallet: AirGapMarketWallet
  private readonly airGapTxs: IAirGapTransaction[]

  constructor(
    public readonly platform: Platform,
    private readonly router: Router,
    private readonly route: ActivatedRoute,
    private readonly deepLinkProvider: DeepLinkProvider,
    private readonly dataService: DataService,
    private readonly operations: OperationsProvider
  ) {
    if (this.route.snapshot.data.special) {
      const info = this.route.snapshot.data.special
      this.wallet = info.wallet
      this.airGapTxs = info.airGapTxs
      this.interactionData = info.data
    }

    this.isDesktop = this.platform.is('electron')
  }

  public async ionViewDidEnter() {}

  public async offlineDeviceSign() {
    const dataQR = await this.prepareQRData()

    const info = {
      wallet: this.wallet,
      airGapTxs: this.airGapTxs,
      data: dataQR
    }
    this.dataService.setData(DataServiceKey.TRANSACTION, info)
    this.router.navigateByUrl('/transaction-qr/' + DataServiceKey.TRANSACTION).catch(handleErrorSentry(ErrorCategory.NAVIGATION))
  }

  public async sameDeviceSign() {
    const dataQR = await this.prepareQRData()

    console.log(dataQR)
    this.deepLinkProvider
      .sameDeviceDeeplink(dataQR)
      .then(() => {
        this.router.navigateByUrl('/tabs/portfolio').catch(handleErrorSentry(ErrorCategory.NAVIGATION))
      })
      .catch(handleErrorSentry(ErrorCategory.DEEPLINK_PROVIDER))
  }

  public ledgerSign() {
    const info = {
      wallet: this.wallet,
      airGapTxs: this.airGapTxs,
      data: this.interactionData
    }
    this.dataService.setData(DataServiceKey.TRANSACTION, info)
    this.router.navigateByUrl('/ledger-sign/' + DataServiceKey.TRANSACTION).catch(handleErrorSentry(ErrorCategory.NAVIGATION))
  }

  private async prepareQRData(): Promise<string | string[]> {
    if (isString(this.interactionData) && this.interactionData.includes('://')) {
      return this.interactionData
    }

    return this.operations.serializeTx(this.wallet, this.interactionData).catch(error => {
      console.warn(`Could not serialize transaction: ${error}`)
      return ''
    })
  }
}
