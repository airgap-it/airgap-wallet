import { Component, Input, OnChanges } from '@angular/core'
import {
  ICoinProtocol,
  Serializer,
  getProtocolByIdentifier,
  IAirGapTransaction,
  SignedTransaction,
  IACMessageDefinitionObject
} from 'airgap-coin-lib'

import { ErrorCategory, handleErrorSentry } from '../../services/sentry-error-handler/sentry-error-handler'
import BigNumber from 'bignumber.js'

@Component({
  selector: 'signed-transaction',
  templateUrl: 'signed-transaction.html',
  styleUrls: ['./signed-transaction.scss']
})
export class SignedTransactionComponent implements OnChanges {
  @Input()
  public signedTxs: IACMessageDefinitionObject[] // TODO: Type

  @Input()
  public syncProtocolString: string

  public airGapTxs: IAirGapTransaction[]
  public fallbackActivated: boolean = false

  public aggregatedInfo:
    | {
        numberOfTxs: number
        totalAmount: BigNumber
        totalFees: BigNumber
      }
    | undefined

  public rawTxData: SignedTransaction

  constructor() {
    //
  }

  public async ngOnChanges(): Promise<void> {
    if (this.syncProtocolString) {
      try {
        const serializer: Serializer = new Serializer()
        const parts: string[] = this.syncProtocolString.split('?d=')
        this.signedTxs = await serializer.deserialize([parts[parts.length - 1]])
      } catch (e) {
        this.fallbackActivated = true
        handleErrorSentry(ErrorCategory.COINLIB)(e)
      }
    }

    // TODO: Handle multiple messages
    if (this.signedTxs.length > 0) {
      const protocol: ICoinProtocol = getProtocolByIdentifier(this.signedTxs[0].protocol)
      try {
        this.airGapTxs = await protocol.getTransactionDetailsFromSigned(this.signedTxs[0].payload as SignedTransaction)
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
        this.fallbackActivated = false
      } catch (e) {
        console.error(e)
        this.fallbackActivated = true
        this.rawTxData = this.signedTxs[0].payload as SignedTransaction
        handleErrorSentry(ErrorCategory.COINLIB)(e)
      }
    }
  }
}
