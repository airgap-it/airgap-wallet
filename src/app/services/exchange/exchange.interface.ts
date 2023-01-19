import { AirGapMarketWallet, FeeDefaults, IAirGapTransaction, ProtocolSymbols, UnsignedTransaction } from '@airgap/coinlib-core'
import { FormGroup } from '@angular/forms'

import { UIWidget } from '../../models/widgets/UIWidget'

export type ExchangeIdentifier = string

export interface ExchangeTransactionStatusResponse {
  status: string

  isPending(): boolean
}

export interface ExchangeTransaction {
  id?: string
  payoutAddress: string
  payinAddress: string
  amountExpectedFrom: string
  amountExpectedTo: string
  fee: string
  exchangeResult?: any
  memo?: any
  transaction?: {
    details?: IAirGapTransaction[]
    unsigned: UnsignedTransaction
  }
}

export interface ExchangeUI {
  form?: FormGroup
  widgets: UIWidget[]
}

export interface Exchange {
  getAvailableFromCurrencies(): Promise<ProtocolSymbols[]>
  getAvailableToCurrenciesForCurrency(selectedFrom: string): Promise<ProtocolSymbols[]>
  getMinAmountForCurrency(fromCurrency: string, toCurrency: string): Promise<string>
  getMaxExchangeAmountForCurrency(fromCurrency: string, toCurrency: string): Promise<string | undefined>
  getExchangeAmount(fromCurrency: string, toCurrency: string, amount: string): Promise<string>
  validateAddress(currency: string, address: string): Promise<{ result: false; message: string }>
  estimateFee(fromWallet: AirGapMarketWallet, toWallet: AirGapMarketWallet, amount: string, data: any): Promise<FeeDefaults | undefined>
  createTransaction(
    fromWallet: AirGapMarketWallet,
    toWallet: AirGapMarketWallet,
    amount: string,
    fee: string,
    data: any
  ): Promise<ExchangeTransaction>
  getStatus(transactionId: string): Promise<ExchangeTransactionStatusResponse>
  convertExchangeIdentifierToAirGapIdentifier(identifiers: string[]): string[]
  convertAirGapIdentifierToExchangeIdentifier(identifiers: string[]): string[]
  getCustomUI(): Promise<ExchangeUI>
  getCustomData(input: unknown): Promise<unknown>
}
