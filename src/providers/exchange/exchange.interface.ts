export interface Exchange {
  getAvailableCurrencies(): Promise<string[]>
  getMinAmountForCurrency(fromCurrency: string, toCurrency: string): Promise<string>
  getExchangeAmount(fromCurrency: string, toCurrency: string, amount: string): Promise<string>
  validateAddress(currency: string, address: string): Promise<{ result: false; message: string }>
  createTransaction(fromCurrency: string, toCurrency: string, address: string, amount: string): Promise<any>
  getStatus(transactionId: string): Promise<any>
}
