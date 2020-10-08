import { DeeplinkService } from '@airgap/angular-core'
import { Component } from '@angular/core'
import { ActivatedRoute, Router } from '@angular/router'
import { Platform } from '@ionic/angular'
import { AirGapMarketWallet, IAirGapTransaction } from 'airgap-coin-lib'
import { LedgerService } from 'src/app/services/ledger/ledger-service'
import { OperationsProvider } from 'src/app/services/operations/operations'

import { DataService, DataServiceKey } from '../../services/data/data.service'
import { ErrorCategory, handleErrorSentry } from '../../services/sentry-error-handler/sentry-error-handler'

@Component({
  selector: 'page-interaction-selection',
  templateUrl: 'interaction-selection.html',
  styleUrls: ['./interaction-selection.scss']
})
export class InteractionSelectionPage {
  public isDesktop: boolean = false
  public isLedgerSupported: boolean = false

  public interactionData: any
  private readonly wallet: AirGapMarketWallet
  private readonly airGapTxs: IAirGapTransaction[]

  constructor(
    public readonly platform: Platform,
    private readonly router: Router,
    private readonly route: ActivatedRoute,
    private readonly deeplinkService: DeeplinkService,
    private readonly dataService: DataService,
    private readonly operations: OperationsProvider,
    private readonly ledgerService: LedgerService
  ) {
    this.isDesktop = this.platform.is('desktop')

    if (this.route.snapshot.data.special) {
      const info = this.route.snapshot.data.special
      this.wallet = info.wallet
      this.airGapTxs = info.airGapTxs
      this.interactionData = info.data

      this.isLedgerSupported = this.isDesktop && this.ledgerService.isProtocolSupported(this.wallet.protocol)
    }
  }

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

    this.deeplinkService
      .sameDeviceDeeplink(Array.isArray(dataQR) ? dataQR.join(',') : dataQR)
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
    if (typeof this.interactionData === 'string' && this.interactionData.includes('://')) {
      return this.interactionData
    }

    return this.operations.serializeSignRequest(this.wallet, this.interactionData).catch(error => {
      console.warn(`Could not serialize transaction: ${error}`)
      // TODO: Show error (toast)

      return this.interactionData // Fallback
    })
  }
}
