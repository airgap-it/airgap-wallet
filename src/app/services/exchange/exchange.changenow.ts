import { HttpClient } from '@angular/common/http'
import { Exchange, ExchangeTransactionStatusResponse } from './exchange.interface'

export interface CurrencyDetailResponse {
  ticker: string
  name: string
  image: string
  hasExternalId: boolean
  isFiat: boolean
  featured: boolean
  isStable: boolean
  supportsFixedRate: boolean
  isAvailable?: boolean
}

export interface MinAmountResponse {
  minAmount: number
}

export interface EstimatedAmountResponse {
  estimatedAmount: number
  transactionSpeedForecast: string
  warningMessage?: any
}

export interface TransactionChangeNowResponse {
  payinAddress: string
  payoutAddress: string
  payoutExtraId: string
  fromCurrency: string
  toCurrency: string
  refundAddress: string
  refundExtraId: string
  id: string
  amount: number
}

export interface ChangeNowTransactionStatus {
  status: string
  payinAddress: string
  payoutAddress: string
  fromCurrency: string
  toCurrency: string
  id: string
  updatedAt: Date
  expectedSendAmount: number
  expectedReceiveAmount: number
  createdAt: Date
  isPartner: boolean
}

export class ChangeNowTransactionStatusResponse implements ExchangeTransactionStatusResponse {
  status: string

  constructor(json: ChangeNowTransactionStatus) {
    this.status = json.status
  }

  isPending(): boolean {
    switch (this.status) {
      case 'finished':
      case 'failed':
      case 'refunded':
      case 'expired':
        return false
      default:
        return true
    }
  }
}

class ChangeNowApi {
  private identifierExchangeToAirGapMap = new Map<string, string>()
  private identifierAirGapToExchangeMap = new Map<string, string>()

  constructor(public http: HttpClient, protected baseURL = 'https://changenow.io/api/v1') {
    this.identifierExchangeToAirGapMap.set('xchf', 'eth-erc20-xchf')
    this.identifierAirGapToExchangeMap.set('eth-erc20-xchf', 'xchf')
  }

  convertExchangeIdentifierToAirGapIdentifier(identifiers: string[]): string[] {
    return identifiers
      .map(identifier => identifier.toLowerCase())
      .map(identifier => {
        return this.identifierExchangeToAirGapMap.has(identifier) ? this.identifierExchangeToAirGapMap.get(identifier) : identifier
      })
  }

  convertAirGapIdentifierToExchangeIdentifier(identifiers: string[]): string[] {
    return identifiers
      .map(identifier => {
        return this.identifierAirGapToExchangeMap.has(identifier) ? this.identifierAirGapToExchangeMap.get(identifier) : identifier
      })
      .map(identifier => identifier.toUpperCase())
  }

  async getAvailableFromCurrencies(): Promise<string[]> {
    const result: CurrencyDetailResponse[] = (await this.http
      .get(`${this.baseURL}/currencies?active=true`)
      .toPromise()) as CurrencyDetailResponse[]
    const fromCurrencies = result.map((identifier: CurrencyDetailResponse) => identifier.ticker)
    return this.convertExchangeIdentifierToAirGapIdentifier(fromCurrencies)
  }

  async getMinAmountForCurrency(fromCurrency: string, toCurrency: string): Promise<string> {
    fromCurrency = this.convertAirGapIdentifierToExchangeIdentifier([fromCurrency])[0]
    toCurrency = this.convertAirGapIdentifierToExchangeIdentifier([toCurrency])[0]

    let result: MinAmountResponse = (await this.http
      .get(`${this.baseURL}/min-amount/${fromCurrency}_${toCurrency}`)
      .toPromise()) as MinAmountResponse

    return result.minAmount.toString()
  }

  async getExchangeAmount(fromCurrency: string, toCurrency: string, amount: string): Promise<string> {
    fromCurrency = this.convertAirGapIdentifierToExchangeIdentifier([fromCurrency])[0]
    toCurrency = this.convertAirGapIdentifierToExchangeIdentifier([toCurrency])[0]
    const response: EstimatedAmountResponse = (await this.http
      .get(`${this.baseURL}/exchange-amount/${amount}/${fromCurrency}_${toCurrency}`)
      .toPromise()) as EstimatedAmountResponse
    return response.estimatedAmount.toString()
  }

  async validateAddress(): Promise<{ result: false; message: string }> {
    return { result: false, message: '' }
  }

  async createTransaction(
    fromCurrency: string,
    toCurrency: string,
    address: string,
    amount: string
  ): Promise<TransactionChangeNowResponse> {
    fromCurrency = this.convertAirGapIdentifierToExchangeIdentifier([fromCurrency])[0]
    toCurrency = this.convertAirGapIdentifierToExchangeIdentifier([toCurrency])[0]

    const apiKey = 'changenow'
    const body = {
      from: fromCurrency,
      to: toCurrency,
      address: address,
      amount: amount,
      extraId: '',
      userId: '',
      contactEmail: '',
      refundAddress: '',
      refundExtraId: ''
    }

    const response: any = await this.http.post(`${this.baseURL}/transactions/${apiKey}`, body).toPromise()

    return response
  }

  async getStatus(transactionId: string): Promise<ChangeNowTransactionStatusResponse> {
    const response = (await this.http
      .get(`${this.baseURL}/transactions/${transactionId}/changenow`)
      .toPromise()) as ChangeNowTransactionStatus
    return new ChangeNowTransactionStatusResponse(response)
  }
}

export class ChangeNowExchange extends ChangeNowApi implements Exchange {
  constructor(public http: HttpClient) {
    super(http)
  }

  public async getAvailableToCurrenciesForCurrency(fromCurrency: string): Promise<string[]> {
    fromCurrency = this.convertAirGapIdentifierToExchangeIdentifier([fromCurrency])[0]
    const result: any = await this.http.get(`${this.baseURL}/currencies-to/${fromCurrency}`).toPromise()
    const identifiers = result
      .filter((currency: CurrencyDetailResponse) => currency.isAvailable)
      .map((currency: CurrencyDetailResponse) => currency.ticker)
    return this.convertExchangeIdentifierToAirGapIdentifier(identifiers)
  }
}
