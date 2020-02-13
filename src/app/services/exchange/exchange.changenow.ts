import { HttpClient } from '@angular/common/http'
import { Exchange } from './exchange.interface'

const BASE_URL = 'https://changenow.io/api/v1'
const ORIGIN = '' // TODO
const CAPTCHA = '6Lcatm8UAAAAABbCBiTLWV3lRlk2hq6vUYoPvmGW'

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

const identifierExchangeToAirGapMap = new Map<string, string>()
identifierExchangeToAirGapMap.set('xchf', 'eth-erc20-xchf')

const identifierAirGapToExchangeMap = new Map<string, string>()
identifierAirGapToExchangeMap.set('eth-erc20-xchf', 'xchf')

class ChangeNowApi {
  constructor(public http: HttpClient) {}

  protected convertExchangeIdentifierToAirGapIdentifier(identifiers: string[]): string[] {
    return identifiers
      .map(identifier => identifier.toLowerCase())
      .map(identifier => {
        return identifierExchangeToAirGapMap.has(identifier) ? identifierExchangeToAirGapMap.get(identifier) : identifier
      })
  }

  protected convertAirGapIdentifierToExchangeIdentifier(identifiers: string[]): string[] {
    return identifiers
      .map(identifier => {
        return identifierAirGapToExchangeMap.has(identifier) ? identifierAirGapToExchangeMap.get(identifier) : identifier
      })
      .map(identifier => identifier.toUpperCase())
  }

  async getAvailableFromCurrencies(): Promise<string[]> {
    const result: CurrencyDetailResponse[] = (await this.http
      .get(`${BASE_URL}/currencies?active=true`)
      .toPromise()) as CurrencyDetailResponse[]
    const fromCurrencies = result.map((identifier: CurrencyDetailResponse) => identifier.ticker)
    return this.convertExchangeIdentifierToAirGapIdentifier(fromCurrencies)
  }

  async getMinAmountForCurrency(fromCurrency: string, toCurrency: string): Promise<string> {
    fromCurrency = this.convertAirGapIdentifierToExchangeIdentifier([fromCurrency])[0]
    toCurrency = this.convertAirGapIdentifierToExchangeIdentifier([toCurrency])[0]

    let result: MinAmountResponse = (await this.http
      .get(`${BASE_URL}/min-amount/${fromCurrency}_${toCurrency}`)
      .toPromise()) as MinAmountResponse

    return result.minAmount.toString()
  }

  async getExchangeAmount(fromCurrency: string, toCurrency: string, amount: string): Promise<string> {
    fromCurrency = this.convertAirGapIdentifierToExchangeIdentifier([fromCurrency])[0]
    toCurrency = this.convertAirGapIdentifierToExchangeIdentifier([toCurrency])[0]

    const response: EstimatedAmountResponse = (await this.http
      .get(`${BASE_URL}/exchange-amount/${amount}/${fromCurrency}_${toCurrency}`)
      .toPromise()) as EstimatedAmountResponse

    console.log('EXCHANGE AMOUNT', response.estimatedAmount.toString())
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

    const response: any = await this.http.post(`${BASE_URL}/transactions/${apiKey}`, body).toPromise()

    return response
  }

  async getStatus(transactionId: string): Promise<any> {
    const response = await this.http.get(`${BASE_URL}rtxid.php?daddr=${transactionId}`).toPromise()
    console.log('res', response)
    return response
  }
}

export class ChangeNowExchange extends ChangeNowApi implements Exchange {
  constructor(public http: HttpClient) {
    super(http)
  }

  public async getAvailableToCurrenciesForCurrency(selectedFrom: string): Promise<string[]> {
    const result: any = await this.http.get(`${BASE_URL}/currencies-to/${selectedFrom}`).toPromise()
    console.log('HARIBOL', result)
    const identifiers = result.map((currency: CurrencyDetailResponse) => currency.ticker)
    return this.convertExchangeIdentifierToAirGapIdentifier(identifiers)
  }
}
