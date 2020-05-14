import { Component } from '@angular/core'
import { Router, ActivatedRoute } from '@angular/router'
import { AirGapMarketWallet, IAirGapTransaction } from 'airgap-coin-lib'
import BigNumber from 'bignumber.js'

import { LedgerService } from 'src/app/services/ledger/ledger-service'
import { LedgerConnection } from 'src/app/ledger/transport/LedgerTransport'
import { LoadingController } from '@ionic/angular'
import { handleErrorSentry, ErrorCategory } from 'src/app/services/sentry-error-handler/sentry-error-handler'
import { DataService, DataServiceKey } from 'src/app/services/data/data.service'

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
    private readonly loadingController: LoadingController,
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
    if (this.ledgerConnection) {
      const signedTx = await this.ledgerService.signTransaction(this.wallet.protocolIdentifier, this.ledgerConnection, this.unsignedTx)
      const info = {
        signedTransactionsSync: signedTx
      }
      this.dataService.setData(DataServiceKey.TRANSACTION, info)
      this.router.navigateByUrl(`/transaction-confirm/${DataServiceKey.TRANSACTION}`).catch(handleErrorSentry(ErrorCategory.NAVIGATION))
    }
  }

  private async connectWithLedger() {
    this.loader = await this.loadingController.create({
      message: 'Connecting device...'
    })

    await this.loader.present().catch(handleErrorSentry(ErrorCategory.IONIC_LOADER))

    try {
      const connectedDevices = await this.ledgerService.getConnectedDevices()
      this.ledgerConnection = connectedDevices[0]

      if (this.ledgerConnection) {
        await this.ledgerService.openConnection(this.ledgerConnection)
        console.log('Connected with', this.ledgerConnection.descriptor)
      }
    } catch (error) {
      console.warn(error)
    } finally {
      this.dismissLoader()
    }
  }

  private dismissLoader() {
    if (this.loader) {
      this.loader.dismiss().catch(handleErrorSentry(ErrorCategory.IONIC_LOADER))
    }
  }
}
