import { HttpClient } from '@angular/common/http'
import { Exchange, ExchangeTransactionStatusResponse } from './exchange.interface'
import { CustomEnum, ExchangeCustomService } from '../exchange-custom/exchange-custom.service'

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
  status: string

  constructor(status: string) {
    this.status = status
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

class ChangellyApi {
  private identifierExchangeToAirGapMap = new Map<string, string>()
  private identifierAirGapToExchangeMap = new Map<string, string>()

  constructor(
    public http: HttpClient,
    public exchangeCustomService: ExchangeCustomService,
    private baseURL = 'https://swap.airgap.prod.gke.papers.tech/'
  ) {
    this.identifierExchangeToAirGapMap.set('ae', 'eth-erc20-ae')
    this.identifierAirGapToExchangeMap.set('eth-erc20-ae', 'ae')
  }

  async makeJsonRpcCall<T, R>(method, params: T): Promise<R> {
    const wrapper: JsonRpcWrapper<T> = {
      id: Math.random()
        .toString(36)
        .substring(6),
      jsonrpc: '2.0',
      method,
      params
    }
    const response = await this.http.post<JsonRpcReturnWrapper<R>>(this.baseURL, wrapper).toPromise()
    if (response.result) {
      return response.result
    } else {
      throw new Error(JSON.stringify(response.error))
    }
  }

  convertExchangeIdentifierToAirGapIdentifier(identifiers: string[]): string[] {
    return identifiers.map(identifier => {
      return this.identifierExchangeToAirGapMap.has(identifier) ? this.identifierExchangeToAirGapMap.get(identifier) : identifier
    })
  }

  convertAirGapIdentifierToExchangeIdentifier(identifiers: string[]): string[] {
    return identifiers.map(identifier => {
      return this.identifierAirGapToExchangeMap.has(identifier) ? this.identifierAirGapToExchangeMap.get(identifier) : identifier
    })
  }

  async getAvailableFromCurrencies(): Promise<string[]> {
    const method = 'getCurrencies'
    const params = {}
    const result = await this.makeJsonRpcCall<Object, string[]>(method, params)
    return this.convertExchangeIdentifierToAirGapIdentifier(result)
  }

  getMinAmountForCurrency(fromCurrency: string, toCurrency: string): Promise<string> {
    fromCurrency = this.convertAirGapIdentifierToExchangeIdentifier([fromCurrency])[0]
    toCurrency = this.convertAirGapIdentifierToExchangeIdentifier([toCurrency])[0]
    if (fromCurrency.toLowerCase() === 'xtz-btc' || toCurrency.toLowerCase() === 'xtz-btc') {
      return this.exchangeCustomService.customLogicTZBTC(CustomEnum.MIN_AMOUNT)
    }
    const method = 'getMinAmount'
    const params = {
      from: fromCurrency,
      to: toCurrency
    }
    return this.makeJsonRpcCall<Object, string>(method, params)
  }

  getExchangeAmount(fromCurrency: string, toCurrency: string, amount: string): Promise<string> {
    fromCurrency = this.convertAirGapIdentifierToExchangeIdentifier([fromCurrency])[0]
    toCurrency = this.convertAirGapIdentifierToExchangeIdentifier([toCurrency])[0]

    if (fromCurrency.toLowerCase() === 'xtz-btc') {
      return this.exchangeCustomService.customLogicTZBTC(CustomEnum.EXCHANGE_AMOUNT_FROM, amount)
    }
    if (toCurrency.toLowerCase() === 'xtz-btc') {
      return this.exchangeCustomService.customLogicTZBTC(CustomEnum.EXCHANGE_AMOUNT_TO, amount)
    }
    const method = 'getExchangeAmount'
    const params = {
      from: fromCurrency,
      to: toCurrency,
      amount
    }
    return this.makeJsonRpcCall<Object, string>(method, params)
  }

  validateAddress(currency: string, address: string): Promise<{ result: false; message: string }> {
    currency = this.convertAirGapIdentifierToExchangeIdentifier([currency])[0]

    const method = 'validateAddress'
    const params = {
      currency,
      address
    }
    return this.makeJsonRpcCall<Object, { result: false; message: string }>(method, params)
  }

  createTransaction(fromCurrency: string, toCurrency: string, address: string, amount: string): Promise<CreateTransactionResponse> {
    fromCurrency = this.convertAirGapIdentifierToExchangeIdentifier([fromCurrency])[0]
    toCurrency = this.convertAirGapIdentifierToExchangeIdentifier([toCurrency])[0]

    const method = 'createTransaction'
    const params = {
      from: fromCurrency,
      to: toCurrency,
      address,
      amount
    }
    return this.makeJsonRpcCall<Object, CreateTransactionResponse>(method, params)
  }

  async getStatus(transactionId: string): Promise<ExchangeTransactionStatusResponse> {
    const method = 'getStatus'
    const params = {
      id: transactionId
    }
    const statusString: string = await this.makeJsonRpcCall<Object, any>(method, params)
    return new ChangellyTransactionStatusResponse(statusString)
  }
}

export class ChangellyExchange extends ChangellyApi implements Exchange {
  constructor(public http: HttpClient, public exchangeCustomService: ExchangeCustomService) {
    super(http, exchangeCustomService)
  }

  public async getAvailableToCurrenciesForCurrency(selectedFrom: string): Promise<string[]> {
    const fromCurrency = this.convertAirGapIdentifierToExchangeIdentifier([selectedFrom])[0]
    const availableCurrencies = await this.getAvailableFromCurrencies()

    if (fromCurrency.toLowerCase() === 'xtz-btc') {
      return this.exchangeCustomService.customLogicTZBTC(CustomEnum.AVAILABLE_TO_CURRENCY)
    }
    return availableCurrencies.filter(availableCurrency => availableCurrency !== selectedFrom)
  }
}
