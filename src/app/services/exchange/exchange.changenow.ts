import { HttpClient } from '@angular/common/http'
import { Exchange } from './exchange.interface'
import { CustomExchangeService, CustomEnum } from '../custom-exchange/custom-exchange.service'
const BASE_URL = 'https://changenow.io/api/v1'

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
  constructor(public http: HttpClient, public customExchangeService: CustomExchangeService) {}

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
    if (fromCurrency.toLowerCase() === 'xtz-btc' || toCurrency.toLowerCase() === 'xtz-btc') {
      return this.customExchangeService.customLogicTZBTC(CustomEnum.MIN_AMOUNT)
    }
    toCurrency = this.convertAirGapIdentifierToExchangeIdentifier([toCurrency])[0]

    let result: MinAmountResponse = (await this.http
      .get(`${BASE_URL}/min-amount/${fromCurrency}_${toCurrency}`)
      .toPromise()) as MinAmountResponse

    return result.minAmount.toString()
  }

  async getExchangeAmount(fromCurrency: string, toCurrency: string, amount: string): Promise<string> {
    fromCurrency = this.convertAirGapIdentifierToExchangeIdentifier([fromCurrency])[0]
    toCurrency = this.convertAirGapIdentifierToExchangeIdentifier([toCurrency])[0]

    if (fromCurrency.toLowerCase() === 'xtz-btc') {
      return this.customExchangeService.customLogicTZBTC(CustomEnum.EXCHANGE_AMOUNT_FROM, amount)
    }
    if (toCurrency.toLowerCase() === 'xtz-btc') {
      return this.customExchangeService.customLogicTZBTC(CustomEnum.EXCHANGE_AMOUNT_FROM, amount)
    }
    const response: EstimatedAmountResponse = (await this.http
      .get(`${BASE_URL}/exchange-amount/${amount}/${fromCurrency}_${toCurrency}`)
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
  constructor(public http: HttpClient, public customExchangeService: CustomExchangeService) {
    super(http, customExchangeService)
  }

  public async getAvailableToCurrenciesForCurrency(fromCurrency: string): Promise<string[]> {
    fromCurrency = this.convertAirGapIdentifierToExchangeIdentifier([fromCurrency])[0]
    if (fromCurrency.toLowerCase() === 'xtz-btc') {
      return this.customExchangeService.customLogicTZBTC(CustomEnum.AVAILABLE_TO_CURRENCY)
    }
    const result: any = await this.http.get(`${BASE_URL}/currencies-to/${fromCurrency}`).toPromise()
    const identifiers = result.map((currency: CurrencyDetailResponse) => currency.ticker)
    return this.convertExchangeIdentifierToAirGapIdentifier(identifiers)
  }
}
