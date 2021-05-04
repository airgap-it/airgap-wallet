import { ProtocolService, SerializerService } from '@airgap/angular-core'
import { Component, Input, OnChanges } from '@angular/core'
import {
  IACMessageDefinitionObject,
  IAirGapTransaction,
  ICoinProtocol,
  MainProtocolSymbols,
  ProtocolSymbols,
  SignedTransaction,
  TezosSaplingProtocol
} from '@airgap/coinlib-core'
import BigNumber from 'bignumber.js'

import { ErrorCategory, handleErrorSentry } from '../../services/sentry-error-handler/sentry-error-handler'
import { AccountProvider } from 'src/app/services/account/account.provider'

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

  constructor(
    private readonly serializerService: SerializerService,
    private readonly protocolService: ProtocolService,
    private readonly accountProvider: AccountProvider
  ) {
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
      let protocol: ICoinProtocol =
        this.protocols && this.protocols[0] ? this.protocols[0] : await this.protocolService.getProtocol(this.signedTxs[0].protocol)

      try {
        this.airGapTxs = (await Promise.all(
          this.signedTxs.map(async (signedTx: IACMessageDefinitionObject) => {
            const payload: SignedTransaction = signedTx.payload as SignedTransaction
            if (await this.checkIfSaplingTransaction(payload, signedTx.protocol)) {
              const saplingProtocol: TezosSaplingProtocol = await this.getSaplingProtocol()
              return saplingProtocol.getTransactionDetailsFromSigned(payload, {
                knownViewingKeys: this.accountProvider.getKnownViewingKeys()
              })
            } else {
              return protocol.getTransactionDetailsFromSigned(payload)
            }
          })
        )).reduce((flatten: IAirGapTransaction[], toFlatten: IAirGapTransaction[]) => flatten.concat(toFlatten), [])

        if (
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
        this.fallbackActivated = false
      } catch (e) {
        console.error(e)
        this.fallbackActivated = true
        this.rawTxData = this.signedTxs[0].payload as SignedTransaction
        handleErrorSentry(ErrorCategory.COINLIB)(e)
      }
    }
  }

  private async checkIfSaplingTransaction(transaction: SignedTransaction, protocolIdentifier: ProtocolSymbols): Promise<boolean> {
    if (protocolIdentifier === MainProtocolSymbols.XTZ) {
      const tezosProtocol: ICoinProtocol = await this.protocolService.getProtocol(protocolIdentifier)
      const saplingProtocol: TezosSaplingProtocol = await this.getSaplingProtocol()

      const txDetails: IAirGapTransaction[] = await tezosProtocol.getTransactionDetailsFromSigned(transaction)
      const recipients: string[] = txDetails
        .map(details => details.to)
        .reduce((flatten: string[], next: string[]) => flatten.concat(next), [])

      return recipients.includes(saplingProtocol.options.config.contractAddress)
    }

    return protocolIdentifier === MainProtocolSymbols.XTZ_SHIELDED
  }

  private async getSaplingProtocol(): Promise<TezosSaplingProtocol> {
    return (await this.protocolService.getProtocol(MainProtocolSymbols.XTZ_SHIELDED)) as TezosSaplingProtocol
  }
}
