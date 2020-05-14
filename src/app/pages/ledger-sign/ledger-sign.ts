import { Component } from '@angular/core'
import { Router, ActivatedRoute } from '@angular/router'
import { AirGapMarketWallet, IAirGapTransaction } from 'airgap-coin-lib'
import BigNumber from 'bignumber.js'

import { LedgerService } from 'src/app/services/ledger/ledger-service'
import { LedgerConnection } from 'src/app/ledger/transport/LedgerTransport'
import { LoadingController, AlertController } from '@ionic/angular'
import { handleErrorSentry, ErrorCategory } from 'src/app/services/sentry-error-handler/sentry-error-handler'
import { DataService, DataServiceKey } from 'src/app/services/data/data.service'
import { TranslateService } from '@ngx-translate/core'
import { isString } from 'util'

@Component({
  selector: 'page-ledger-sign',
  templateUrl: 'ledger-sign.html',
  styleUrls: ['./ledger-sign.scss']
})
export class LedgerSignPage {
  public readonly wallet: AirGapMarketWallet = null
  public readonly airGapTxs: IAirGapTransaction[] = null
  public readonly aggregatedInfo?: {
    numberOfTxs: number
    totalAmount: BigNumber
    totalFees: BigNumber
  }

  private readonly unsignedTx: any
  private ledgerConnection?: LedgerConnection

  private loader: HTMLIonLoadingElement | undefined

  constructor(
    private readonly router: Router,
    private readonly route: ActivatedRoute,
    private readonly dataService: DataService,
    private readonly alertCtrl: AlertController,
    private readonly loadingController: LoadingController,
    private readonly translateService: TranslateService,
    private readonly ledgerService: LedgerService
  ) {
    if (this.route.snapshot.data.special) {
      const info = this.route.snapshot.data.special
      this.wallet = info.wallet
      this.airGapTxs = info.airGapTxs
      this.unsignedTx = info.data

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

    this.connectWithLedger()
  }

  public async signTx() {
    await this.showLoader('Signing transaction...')

    try {
      if (!this.ledgerConnection) {
        throw new Error('No device has been found.')
      }

      const signedTx = await this.ledgerService.signTransaction(this.wallet.protocolIdentifier, this.ledgerConnection, this.unsignedTx)
      const info = {
        signedTransactionsSync: signedTx
      }
      this.dataService.setData(DataServiceKey.TRANSACTION, info)
      this.router.navigateByUrl(`/transaction-confirm/${DataServiceKey.TRANSACTION}`).catch(handleErrorSentry(ErrorCategory.NAVIGATION))
    } catch (error) {
      console.warn(error)
      this.promptError(error)
    } finally {
      this.dismissLoader()
    }
  }

  private async connectWithLedger() {
    await this.showLoader('Connecting device...')

    try {
      const connectedDevices = await this.ledgerService.getConnectedDevices()
      this.ledgerConnection = connectedDevices[0]

      if (this.ledgerConnection) {
        await this.ledgerService.openConnection(this.ledgerConnection)
        console.log('Connected with', this.ledgerConnection.descriptor)
      }
    } catch (error) {
      console.warn(error)
      this.promptError(error)
    } finally {
      this.dismissLoader()
    }
  }

  private async promptError(error) {
    let message: string
    if (isString(error)) {
      message = error
    } else if (error instanceof Error) {
      message = error.message
    } else {
      message = this.translateService.instant('account-import-ledger.error-alert.unknown')
    }

    const alert: HTMLIonAlertElement = await this.alertCtrl.create({
      header: this.translateService.instant('ledger-sign.error-alert.header'),
      message,
      buttons: [
        {
          text: this.translateService.instant('ledger-sign.error-alert.confirm')
        }
      ]
    })
    alert.present().catch(handleErrorSentry(ErrorCategory.IONIC_ALERT))
  }

  private async showLoader(message: string) {
    this.dismissLoader()
    this.loader = await this.loadingController.create({ message })

    await this.loader.present().catch(handleErrorSentry(ErrorCategory.IONIC_LOADER))
  }

  private dismissLoader() {
    if (this.loader) {
      this.loader.dismiss().catch(handleErrorSentry(ErrorCategory.IONIC_LOADER))
      this.loader = null
    }
  }
}
