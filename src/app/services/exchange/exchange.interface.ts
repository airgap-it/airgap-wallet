import { ProtocolSymbols } from '@airgap/coinlib-core'

export type ExchangeIdentifier = string

export interface ExchangeTransactionStatusResponse {
  status: string

  isPending(): boolean
}

export interface Exchange {
  getAvailableFromCurrencies(): Promise<ProtocolSymbols[]>
  getAvailableToCurrenciesForCurrency(selectedFrom: string): Promise<ProtocolSymbols[]>
  getMinAmountForCurrency(fromCurrency: string, toCurrency: string): Promise<string>
  getExchangeAmount(fromCurrency: string, toCurrency: string, amount: string): Promise<string>
  validateAddress(currency: string, address: string): Promise<{ result: false; message: string }>
  createTransaction(fromCurrency: string, toCurrency: string, toAddress: string, amount: string, fromAddress?: string): Promise<any>
  getStatus(transactionId: string): Promise<ExchangeTransactionStatusResponse>
  convertExchangeIdentifierToAirGapIdentifier(identifiers: string[]): string[]
  convertAirGapIdentifierToExchangeIdentifier(identifiers: string[]): string[]
}
