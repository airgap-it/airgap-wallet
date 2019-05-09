import { Component, Input } from '@angular/core'
import {
  DeserializedSyncProtocol,
  getProtocolByIdentifier,
  IAirGapTransaction,
  SignedTransaction,
  SyncProtocolUtils
} from 'airgap-coin-lib'

import { ErrorCategory, handleErrorSentry } from '../../services/sentry-error-handler/sentry-error-handler'

@Component({
  selector: 'signed-transaction',
  templateUrl: 'signed-transaction.html',
  styleUrls: ['./signed-transaction.scss']
})
export class SignedTransactionComponent {
  @Input()
  public signedTx: DeserializedSyncProtocol

  @Input()
  public syncProtocolString: string

  public airGapTx: IAirGapTransaction
  public fallbackActivated: boolean = false

  public rawTxData: SignedTransaction

  constructor() {
    //
  }

  public async ngOnChanges() {
    if (this.syncProtocolString) {
      try {
        const syncUtils = new SyncProtocolUtils()
        const parts = this.syncProtocolString.split('?d=')
        this.signedTx = await syncUtils.deserialize(parts[parts.length - 1])
      } catch (e) {
        this.fallbackActivated = true
        handleErrorSentry(ErrorCategory.COINLIB)(e)
      }
    }

    if (this.signedTx) {
      const protocol = getProtocolByIdentifier(this.signedTx.protocol)
      try {
        this.airGapTx = await protocol.getTransactionDetailsFromSigned(this.signedTx.payload as SignedTransaction)
        this.fallbackActivated = false
      } catch (e) {
        this.fallbackActivated = true
        this.rawTxData = this.signedTx.payload as SignedTransaction
        handleErrorSentry(ErrorCategory.COINLIB)(e)
      }
    }
  }
}
