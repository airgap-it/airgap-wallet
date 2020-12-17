import { HttpClient } from '@angular/common/http'
import { ProtocolSymbols } from '@airgap/coinlib-core'

import { Exchange, ExchangeIdentifier, ExchangeTransactionStatusResponse } from './exchange.interface'

// tslint:disable:max-classes-per-file

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

interface JsonRpcWrapper<T> {
  id: string
  jsonrpc: string
  method: string
  params: T
}

interface JsonRpcResponseError {
  code: number
  message: string
}

interface JsonRpcReturnWrapper<T> {
  id: string
  jsonrpc: string
  method: string
  result?: T
  error?: JsonRpcResponseError
}

export class ChangellyTransactionStatusResponse implements ExchangeTransactionStatusResponse {
  public status: string

  constructor(status: string) {
    this.status = status
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

class ChangellyApi {
  private readonly identifierExchangeToAirGapMap: Map<ExchangeIdentifier, ProtocolSymbols> = new Map<ExchangeIdentifier, ProtocolSymbols>()
  private readonly identifierAirGapToExchangeMap: Map<ProtocolSymbols, ExchangeIdentifier> = new Map<ProtocolSymbols, ExchangeIdentifier>()

  constructor(public http: HttpClient, private readonly baseURL: string = 'https://swap.airgap.prod.gke.papers.tech/') {}

  public async makeJsonRpcCall<T, R>(method: string, params: T): Promise<R> {
    const wrapper: JsonRpcWrapper<T> = {
      id: Math.random()
        .toString(36)
        .substring(6),
      jsonrpc: '2.0',
      method,
      params
    }
    const response: JsonRpcReturnWrapper<R> = await this.http.post<JsonRpcReturnWrapper<R>>(this.baseURL, wrapper).toPromise()
    if (response.result) {
      return response.result
    } else {
      throw new Error(JSON.stringify(response.error))
    }
  }

  public convertExchangeIdentifierToAirGapIdentifier(identifiers: ExchangeIdentifier[]): ProtocolSymbols[] {
    return identifiers.map((identifier: ExchangeIdentifier) => {
      return this.identifierExchangeToAirGapMap.has(identifier)
        ? this.identifierExchangeToAirGapMap.get(identifier)
        : (identifier as ProtocolSymbols)
    })
  }

  public convertAirGapIdentifierToExchangeIdentifier(identifiers: ProtocolSymbols[]): ExchangeIdentifier[] {
    return identifiers.map((identifier: ProtocolSymbols) => {
      return this.identifierAirGapToExchangeMap.has(identifier) ? this.identifierAirGapToExchangeMap.get(identifier) : identifier
    })
  }

  public async getAvailableFromCurrencies(): Promise<ProtocolSymbols[]> {
    const method: string = 'getCurrencies'
    const params: {} = {}
    const result: ExchangeIdentifier[] = await this.makeJsonRpcCall<Object, ExchangeIdentifier[]>(method, params)

    return this.convertExchangeIdentifierToAirGapIdentifier(result)
  }

  public async getMinAmountForCurrency(fromCurrency: ProtocolSymbols, toCurrency: ProtocolSymbols): Promise<string> {
    const transformedFromCurrency: ExchangeIdentifier = this.convertAirGapIdentifierToExchangeIdentifier([fromCurrency])[0]
    const transformedToCurrency: ExchangeIdentifier = this.convertAirGapIdentifierToExchangeIdentifier([toCurrency])[0]
    const method: string = 'getMinAmount'

    return this.makeJsonRpcCall<Object, string>(method, {
      from: transformedFromCurrency,
      to: transformedToCurrency
    })
  }

  public async getExchangeAmount(fromCurrency: ProtocolSymbols, toCurrency: ProtocolSymbols, amount: string): Promise<string> {
    const transformedFromCurrency: ExchangeIdentifier = this.convertAirGapIdentifierToExchangeIdentifier([fromCurrency])[0]
    const transformedToCurrency: ExchangeIdentifier = this.convertAirGapIdentifierToExchangeIdentifier([toCurrency])[0]
    const method: string = 'getExchangeAmount'

    return this.makeJsonRpcCall<Object, string>(method, {
      from: transformedFromCurrency,
      to: transformedToCurrency,
      amount
    })
  }

  public async validateAddress(currency: ProtocolSymbols, address: string): Promise<{ result: false; message: string }> {
    const transformedCurrency: ExchangeIdentifier = this.convertAirGapIdentifierToExchangeIdentifier([currency])[0]

    const method: string = 'validateAddress'

    return this.makeJsonRpcCall<Object, { result: false; message: string }>(method, {
      currency: transformedCurrency,
      address
    })
  }

  public async createTransaction(
    fromCurrency: ProtocolSymbols,
    toCurrency: ProtocolSymbols,
    toAddress: string,
    amount: string,
    _fromAddress?: string
  ): Promise<CreateTransactionResponse> {
    const transformedFromCurrency: ExchangeIdentifier = this.convertAirGapIdentifierToExchangeIdentifier([fromCurrency])[0]
    const transformedToCurrency: ExchangeIdentifier = this.convertAirGapIdentifierToExchangeIdentifier([toCurrency])[0]

    const method: string = 'createTransaction'

    return this.makeJsonRpcCall<Object, CreateTransactionResponse>(method, {
      from: transformedFromCurrency,
      to: transformedToCurrency,
      address: toAddress,
      amount
    })
  }

  public async getStatus(transactionId: string): Promise<ExchangeTransactionStatusResponse> {
    const method: string = 'getStatus'

    const statusString: string = await this.makeJsonRpcCall<Object, string>(method, {
      id: transactionId
    })

    return new ChangellyTransactionStatusResponse(statusString)
  }
}

export class ChangellyExchange extends ChangellyApi implements Exchange {
  constructor(public http: HttpClient) {
    super(http)
  }

  public async getAvailableToCurrenciesForCurrency(selectedFrom: ProtocolSymbols): Promise<ProtocolSymbols[]> {
    const availableCurrencies: ProtocolSymbols[] = await this.getAvailableFromCurrencies()

    return availableCurrencies.filter((availableCurrency: ProtocolSymbols) => availableCurrency !== selectedFrom)
  }
}
