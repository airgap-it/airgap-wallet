import { Component } from '@angular/core'
import { Router, ActivatedRoute } from '@angular/router'
import { AirGapMarketWallet, IAirGapTransaction } from 'airgap-coin-lib'
import BigNumber from 'bignumber.js'

import { LedgerService } from 'src/app/services/ledger/ledger-service'
import { LedgerConnection } from 'src/app/services/ledger/ledger-connection'

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

  constructor(private readonly router: Router, private readonly route: ActivatedRoute, private readonly ledgerService: LedgerService) {
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
      console.log(signedTx, this.router)
    }
  }

  private async connectWithLedger() {
    const connectedDevices = await this.ledgerService.getConnectedDevices()
    console.log(connectedDevices)
  }
}
