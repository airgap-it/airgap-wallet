import { ProtocolService } from '@airgap/angular-core'
import { Component, Input, OnChanges } from '@angular/core'
import { IACMessageDefinitionObject, IAirGapTransaction, ICoinProtocol, SignedTransaction } from 'airgap-coin-lib'
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
  public signedTxs: IACMessageDefinitionObject[] | undefined // TODO: Type

  @Input()
  public protocols: ICoinProtocol[] | undefined

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

  constructor(private readonly serializerService: SerializerService, private readonly protocolService: ProtocolService) {
    //
  }

  public async ngOnChanges(): Promise<void> {
    if (this.syncProtocolString) {
      try {
        this.signedTxs = await this.serializerService.deserialize(this.syncProtocolString)[0]
      } catch (e) {
        this.fallbackActivated = true
        handleErrorSentry(ErrorCategory.COINLIB)(e)
      }
    }

    // TODO: Handle multiple messages
    if (this.signedTxs) {
      const protocol: ICoinProtocol =
        this.protocols && this.protocols[0] ? this.protocols[0] : await this.protocolService.getProtocol(this.signedTxs[0].protocol)
      try {
        this.airGapTxs = (await Promise.all(
          this.signedTxs.map((signedTx: IACMessageDefinitionObject) =>
            protocol.getTransactionDetailsFromSigned(signedTx.payload as SignedTransaction)
          )
        )).reduce((flatten: IAirGapTransaction[], toFlatten: IAirGapTransaction[]) => flatten.concat(toFlatten), [])

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
