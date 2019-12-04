import { Component, Input, OnChanges } from '@angular/core'
import { getProtocolByIdentifier, IACMessageDefinitionObject, IAirGapTransaction, ICoinProtocol, SignedTransaction } from 'airgap-coin-lib'
import BigNumber from 'bignumber.js'

import { ErrorCategory, handleErrorSentry } from '../../services/sentry-error-handler/sentry-error-handler'
import { SerializerService } from '../../services/serializer/serializer.service'

@Component({
  selector: 'signed-transaction',
  templateUrl: 'signed-transaction.html',
  styleUrls: ['./signed-transaction.scss']
})
export class SignedTransactionComponent implements OnChanges {
  @Input()
  public signedTx: IACMessageDefinitionObject | undefined // TODO: Type

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

  constructor(private readonly serializerService: SerializerService) {
    //
  }

  public async ngOnChanges(): Promise<void> {
    if (this.syncProtocolString) {
      try {
        this.signedTx = await this.serializerService.deserialize(this.syncProtocolString)[0]
      } catch (e) {
        this.fallbackActivated = true
        handleErrorSentry(ErrorCategory.COINLIB)(e)
      }
    }

    // TODO: Handle multiple messages
    if (this.signedTx) {
      const protocol: ICoinProtocol = getProtocolByIdentifier(this.signedTx.protocol)
      try {
        this.airGapTxs = await protocol.getTransactionDetailsFromSigned(this.signedTx.payload as SignedTransaction)
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
        this.rawTxData = this.signedTx.payload as SignedTransaction
        handleErrorSentry(ErrorCategory.COINLIB)(e)
      }
    }
  }
}
