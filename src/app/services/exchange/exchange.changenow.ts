import { HttpClient } from '@angular/common/http'
import { Exchange } from './exchange.interface'

const BASE_URL = 'https://external.cryptowolf.eu/wallet/'
const ORIGIN = '' // TODO
const CAPTCHA = '6Lcatm8UAAAAABbCBiTLWV3lRlk2hq6vUYoPvmGW'

export interface CreateTransactionResponse {
  amountExpectedFrom: string
  amountExpectedTo: string
  amountTo: number
  apiExtraFee: string
  changellyFee: string
  createdAt: string
  currencyFrom: string
  currencyTo: string
  id: string
  kycRequired: boolean
  payinAddress: string
  payinExtraId: null
  payoutAddress: string
  status: string
}

const identifierExchangeToAirGapMap = new Map<string, string>()
identifierExchangeToAirGapMap.set('ae', 'eth-erc20-ae')
identifierExchangeToAirGapMap.set('aem', 'ae')

const identifierAirGapToExchangeMap = new Map<string, string>()
identifierAirGapToExchangeMap.set('eth-erc20-ae', 'ae')
identifierAirGapToExchangeMap.set('ae', 'aem')

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
    const result: any = await this.http.get(`${BASE_URL}get-pairs.php`).toPromise()
    const fromCurrencies = Object.keys(result)
    console.log('from', fromCurrencies)
    return this.convertExchangeIdentifierToAirGapIdentifier(fromCurrencies)
  }

  async getMinAmountForCurrency(fromCurrency: string, toCurrency: string): Promise<string> {
    fromCurrency = this.convertAirGapIdentifierToExchangeIdentifier([fromCurrency])[0]
    toCurrency = this.convertAirGapIdentifierToExchangeIdentifier([toCurrency])[0]

    return '0'
  }

  async getExchangeAmount(fromCurrency: string, toCurrency: string, amount: string): Promise<string> {
    fromCurrency = this.convertAirGapIdentifierToExchangeIdentifier([fromCurrency])[0]
    toCurrency = this.convertAirGapIdentifierToExchangeIdentifier([toCurrency])[0]

    const params = {
      from: fromCurrency,
      to: toCurrency,
      amount,
      origin: ORIGIN
    }

    let queryParams = []

    Object.keys(params).forEach(key => {
      queryParams.push(`${key}=${params[key]}`)
    })

    const response: any = await this.http.get(`${BASE_URL}send-amount.php?${queryParams.join('&')}`).toPromise()

    return response
  }

  async validateAddress(currency: string, address: string): Promise<{ result: false; message: string }> {
    return { result: false, message: '' }
  }

  async createTransaction(fromCurrency: string, toCurrency: string, address: string, amount: string): Promise<CreateTransactionResponse> {
    fromCurrency = this.convertAirGapIdentifierToExchangeIdentifier([fromCurrency])[0]
    toCurrency = this.convertAirGapIdentifierToExchangeIdentifier([toCurrency])[0]

    const formData = new FormData()
    formData.append('from', fromCurrency)
    formData.append('to', toCurrency)
    formData.append('amount', amount)
    formData.append('receivingid', address)
    formData.append('receivingamount', '10')
    formData.append('usd', '1')
    formData.append('refundid', address)
    formData.append('origin', ORIGIN)
    formData.append('captcha', CAPTCHA)

    const response: any = await this.http.post(`${BASE_URL}mail.php`, formData).toPromise()

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
    const result: any = await this.http.get(`${BASE_URL}get-pairs.php`).toPromise()

    console.log('asdf', this.convertExchangeIdentifierToAirGapIdentifier(result[selectedFrom.toUpperCase()]))
    return this.convertExchangeIdentifierToAirGapIdentifier(result[selectedFrom.toUpperCase()]).filter(
      availableCurrency => availableCurrency !== selectedFrom
    )
  }
}
