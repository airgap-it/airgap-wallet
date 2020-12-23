import { HttpClient } from '@angular/common/http'
import { MainProtocolSymbols, ProtocolSymbols } from '@airgap/coinlib-core'

import { Exchange, ExchangeIdentifier, ExchangeTransactionStatusResponse } from './exchange.interface'

// tslint:disable:max-classes-per-file

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
  public status: string

  constructor(json: ChangeNowTransactionStatus) {
    this.status = json.status
  }

  public isPending(): boolean {
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
  private readonly identifierExchangeToAirGapMap: Map<ExchangeIdentifier, ProtocolSymbols> = new Map<ExchangeIdentifier, ProtocolSymbols>()
  private readonly identifierAirGapToExchangeMap: Map<ProtocolSymbols, ExchangeIdentifier> = new Map<ProtocolSymbols, ExchangeIdentifier>()

  constructor(public http: HttpClient, protected readonly baseURL: string = 'https://changenow.io/api/v1') {
    this.identifierExchangeToAirGapMap.set('xchf', 'eth-erc20-xchf' as ProtocolSymbols)
    this.identifierExchangeToAirGapMap.set('atom', MainProtocolSymbols.COSMOS)
    this.identifierExchangeToAirGapMap.set('dot', MainProtocolSymbols.POLKADOT)
    this.identifierExchangeToAirGapMap.set('ksm', MainProtocolSymbols.KUSAMA)
    this.identifierAirGapToExchangeMap.set('eth-erc20-xchf' as ProtocolSymbols, 'xchf')
    this.identifierAirGapToExchangeMap.set(MainProtocolSymbols.COSMOS, 'atom')
    this.identifierAirGapToExchangeMap.set(MainProtocolSymbols.POLKADOT, 'dot')
    this.identifierAirGapToExchangeMap.set(MainProtocolSymbols.KUSAMA, 'ksm')
  }

  public convertExchangeIdentifierToAirGapIdentifier(identifiers: ExchangeIdentifier[]): ProtocolSymbols[] {
    return identifiers
      .map((identifier: ExchangeIdentifier) => identifier.toLowerCase())
      .map((identifier: ExchangeIdentifier) => {
        return this.identifierExchangeToAirGapMap.has(identifier)
          ? this.identifierExchangeToAirGapMap.get(identifier)
          : (identifier as ProtocolSymbols)
      })
  }

  public convertAirGapIdentifierToExchangeIdentifier(identifiers: ProtocolSymbols[]): ExchangeIdentifier[] {
    return identifiers
      .map((identifier: ProtocolSymbols) => {
        return this.identifierAirGapToExchangeMap.has(identifier) ? this.identifierAirGapToExchangeMap.get(identifier) : identifier
      })
      .map((identifier: ExchangeIdentifier) => identifier.toUpperCase())
  }

  public async getAvailableFromCurrencies(): Promise<ProtocolSymbols[]> {
    const result: CurrencyDetailResponse[] = await this.http
      .get<CurrencyDetailResponse[]>(`${this.baseURL}/currencies?active=true`)
      .toPromise()
    const fromCurrencies: ExchangeIdentifier[] = result.map((identifier: CurrencyDetailResponse) => identifier.ticker)

    return this.convertExchangeIdentifierToAirGapIdentifier(fromCurrencies)
  }

  public async getMinAmountForCurrency(fromCurrency: ProtocolSymbols, toCurrency: ProtocolSymbols): Promise<string> {
    const transformedFromCurrency: ExchangeIdentifier = this.convertAirGapIdentifierToExchangeIdentifier([fromCurrency])[0]
    const transformedToCurrency: ExchangeIdentifier = this.convertAirGapIdentifierToExchangeIdentifier([toCurrency])[0]

    const result: MinAmountResponse = await this.http
      .get<MinAmountResponse>(`${this.baseURL}/min-amount/${transformedFromCurrency}_${transformedToCurrency}`)
      .toPromise()

    return result.minAmount.toString()
  }

  public async getExchangeAmount(fromCurrency: ProtocolSymbols, toCurrency: ProtocolSymbols, amount: string): Promise<string> {
    const transformedFromCurrency: ExchangeIdentifier = this.convertAirGapIdentifierToExchangeIdentifier([fromCurrency])[0]
    const transformedToCurrency: ExchangeIdentifier = this.convertAirGapIdentifierToExchangeIdentifier([toCurrency])[0]

    const response: EstimatedAmountResponse = await this.http
      .get<EstimatedAmountResponse>(`${this.baseURL}/exchange-amount/${amount}/${transformedFromCurrency}_${transformedToCurrency}`)
      .toPromise()

    return response.estimatedAmount.toString()
  }

  public async validateAddress(): Promise<{ result: false; message: string }> {
    return { result: false, message: '' }
  }

  public async createTransaction(
    fromCurrency: ProtocolSymbols,
    toCurrency: ProtocolSymbols,
    toAddress: string,
    amount: string,
    fromAddress?: string
  ): Promise<TransactionChangeNowResponse> {
    const transformedFromCurrency: ExchangeIdentifier = this.convertAirGapIdentifierToExchangeIdentifier([fromCurrency])[0]
    const transformedToCurrency: ExchangeIdentifier = this.convertAirGapIdentifierToExchangeIdentifier([toCurrency])[0]

    const apiKey: string = '5eca82aabfdf9684e8fe4ff35245d9d4f2cbb1153e0f1025b697941c982763d1'

    const response: any = await this.http
      .post<TransactionChangeNowResponse>(`${this.baseURL}/transactions/${apiKey}`, {
        from: transformedFromCurrency,
        to: transformedToCurrency,
        address: toAddress,
        amount,
        extraId: '',
        userId: '',
        contactEmail: '',
        refundAddress: fromAddress ? fromAddress : '',
        refundExtraId: ''
      })
      .toPromise()

    return response
  }

  public async getStatus(transactionId: string): Promise<ChangeNowTransactionStatusResponse> {
    const response: ChangeNowTransactionStatus = await this.http
      .get<ChangeNowTransactionStatus>(`${this.baseURL}/transactions/${transactionId}/changenow`)
      .toPromise()

    return new ChangeNowTransactionStatusResponse(response)
  }
}

export class ChangeNowExchange extends ChangeNowApi implements Exchange {
  constructor(public http: HttpClient) {
    super(http)
  }

  public async getAvailableToCurrenciesForCurrency(fromCurrency: ProtocolSymbols): Promise<ProtocolSymbols[]> {
    const transformedFromCurrency: ExchangeIdentifier = this.convertAirGapIdentifierToExchangeIdentifier([fromCurrency])[0]

    const result: CurrencyDetailResponse[] = await this.http
      .get<CurrencyDetailResponse[]>(`${this.baseURL}/currencies-to/${transformedFromCurrency}`)
      .toPromise()

    const identifiers: ExchangeIdentifier[] = result
      .filter((currency: CurrencyDetailResponse) => currency.isAvailable)
      .map((currency: CurrencyDetailResponse) => currency.ticker)

    return this.convertExchangeIdentifierToAirGapIdentifier(identifiers)
  }
}
