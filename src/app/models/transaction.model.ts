import { IAirGapTransaction } from 'airgap-coin-lib'
import { BigNumber } from 'bignumber.js'

// tslint:disable:max-classes-per-file

export class TransactionParameter {
  public label: string
  public value: string
  public type: string
}

export class Transaction implements IAirGapTransaction {
  public amount: string
  public blockHeight: string
  public data: string
  public fee: string
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

  constructor(from: string[], to: string[], amount: string, fee: string, protocolIdentifier: string, payload?: string) {
    this.from = from
    this.to = to
    this.amount = amount
    this.fee = fee
    this.protocolIdentifier = protocolIdentifier
    this.payload = payload
  }

  public static fromAirGapTx(airgapTx: IAirGapTransaction, payload: string) {
    return new Transaction(airgapTx.from, airgapTx.to, airgapTx.amount, airgapTx.fee, airgapTx.protocolIdentifier, payload)
  }
}
