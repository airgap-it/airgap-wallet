import { HttpClient } from '@angular/common/http'
import { Exchange } from './exchange.interface'
import { CustomEnum, ExchangeCustomService } from '../exchange-custom/exchange-custom.service'

const BASE_URL = 'https://swap.airgap.prod.gke.papers.tech/'

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

const identifierExchangeToAirGapMap = new Map<string, string>()
identifierExchangeToAirGapMap.set('ae', 'eth-erc20-ae')

const identifierAirGapToExchangeMap = new Map<string, string>()
identifierAirGapToExchangeMap.set('eth-erc20-ae', 'ae')

class ChangellyApi {
  constructor(public http: HttpClient, public ExchangeCustomService: ExchangeCustomService) {}

  async makeJsonRpcCall<T, R>(method, params: T): Promise<R> {
    const wrapper: JsonRpcWrapper<T> = {
      id: Math.random()
        .toString(36)
        .substring(6),
      jsonrpc: '2.0',
      method,
      params
    }
    const response = await this.http.post<JsonRpcReturnWrapper<R>>(BASE_URL, wrapper).toPromise()
    if (response.result) {
      return response.result
    } else {
      throw new Error(JSON.stringify(response.error))
    }
  }

  convertExchangeIdentifierToAirGapIdentifier(identifiers: string[]): string[] {
    return identifiers.map(identifier => {
      return identifierExchangeToAirGapMap.has(identifier) ? identifierExchangeToAirGapMap.get(identifier) : identifier
    })
  }

  convertAirGapIdentifierToExchangeIdentifier(identifiers: string[]): string[] {
    return identifiers.map(identifier => {
      return identifierAirGapToExchangeMap.has(identifier) ? identifierAirGapToExchangeMap.get(identifier) : identifier
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
      return this.ExchangeCustomService.customLogicTZBTC(CustomEnum.MIN_AMOUNT)
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
      return this.ExchangeCustomService.customLogicTZBTC(CustomEnum.EXCHANGE_AMOUNT_FROM, amount)
    }
    if (toCurrency.toLowerCase() === 'xtz-btc') {
      return this.ExchangeCustomService.customLogicTZBTC(CustomEnum.EXCHANGE_AMOUNT_TO, amount)
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

  getStatus(transactionId: string): Promise<any> {
    const method = 'getStatus'
    const params = {
      id: transactionId
    }
    return this.makeJsonRpcCall<Object, any>(method, params)
  }
}

export class ChangellyExchange extends ChangellyApi implements Exchange {
  constructor(public http: HttpClient, public ExchangeCustomService: ExchangeCustomService) {
    super(http, ExchangeCustomService)
  }

  public async getAvailableToCurrenciesForCurrency(selectedFrom: string): Promise<string[]> {
    const fromCurrency = this.convertAirGapIdentifierToExchangeIdentifier([selectedFrom])[0]
    const availableCurrencies = await this.getAvailableFromCurrencies()

    if (fromCurrency.toLowerCase() === 'xtz-btc') {
      return this.ExchangeCustomService.customLogicTZBTC(CustomEnum.AVAILABLE_TO_CURRENCY)
    }
    return availableCurrencies.filter(availableCurrency => availableCurrency !== selectedFrom)
  }
}
