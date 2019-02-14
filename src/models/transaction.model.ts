import { IAirGapTransaction } from 'airgap-coin-lib'
import { BigNumber } from 'bignumber.js'

export class TransactionParameter {
  label: string
  value: string
  type: string
}

export class Transaction implements IAirGapTransaction {
  amount: BigNumber
  blockHeight: string
  data: string
  fee: BigNumber
  from: string[]
  hash: string

  isInbound: boolean
  meta: {} = {}
  protocolIdentifier: string
  to: string[]
  timestamp: number

  information: TransactionParameter[] = []

  payload: string
  publicKey: string

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

  static fromAirGapTx(airgapTx: IAirGapTransaction, payload: string) {
    return new Transaction(airgapTx.from, airgapTx.to, airgapTx.amount, airgapTx.fee, airgapTx.protocolIdentifier, payload)
  }
}
