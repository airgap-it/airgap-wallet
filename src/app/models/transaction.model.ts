import { IAirGapTransaction } from 'airgap-coin-lib'
import { BigNumber } from 'bignumber.js'

export class TransactionParameter {
  public label: string
  public value: string
  public type: string
}

export class Transaction implements IAirGapTransaction {
  public amount: BigNumber
  public blockHeight: string
  public data: string
  public fee: BigNumber
  public from: string[]
  public hash: string

  public isInbound: boolean
  public meta: {} = {}
  public protocolIdentifier: string
  public to: string[]
  public timestamp: number

  public information: TransactionParameter[] = []

  public payload: string
  public publicKey: string

  constructor(
    from: string[],
    to: string[],
    amount: string | BigNumber,
    fee: string | BigNumber,
    protocolIdentifier: string,
    payload?: string
  ) {
    this.from = from
    this.to = to
    this.amount = new BigNumber(amount)
    this.fee = new BigNumber(fee)
    this.protocolIdentifier = protocolIdentifier
    this.payload = payload
  }

  public static fromAirGapTx(airgapTx: IAirGapTransaction, payload: string) {
    return new Transaction(airgapTx.from, airgapTx.to, airgapTx.amount, airgapTx.fee, airgapTx.protocolIdentifier, payload)
  }
}
