import { HttpClient } from '@angular/common/http'
import { Injectable } from '@angular/core'
import { Exchange } from './exchange.interface'

const CHANGELLY_BASE_URL = 'http://swap.airgap.gke.papers.tech/'

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

@Injectable()
export class ExchangeProvider implements Exchange {
  constructor(public http: HttpClient) {}

  async makeJsonRpcCall<T, R>(method, params: T): Promise<R> {
    const wrapper: JsonRpcWrapper<T> = {
      id: Math.random()
        .toString(36)
        .substring(6),
      jsonrpc: '2.0',
      method,
      params
    }
    const response = await this.http.post<JsonRpcReturnWrapper<R>>(CHANGELLY_BASE_URL, wrapper).toPromise()
    if (response.result) {
      return response.result
    } else {
      throw new Error(JSON.stringify(response.error))
    }
  }

  getAvailableCurrencies(): Promise<string[]> {
    const method = 'getCurrencies'
    const params = {}
    return this.makeJsonRpcCall<Object, string[]>(method, params)
  }

  getMinAmountForCurrency(fromCurrency: string, toCurrency: string): Promise<string> {
    const method = 'getMinAmount'
    const params = {
      from: fromCurrency,
      to: toCurrency
    }
    return this.makeJsonRpcCall<Object, string>(method, params)
  }

  getExchangeAmount(fromCurrency: string, toCurrency: string, amount: string): Promise<string> {
    const method = 'getExchangeAmount'
    const params = {
      from: fromCurrency,
      to: toCurrency,
      amount
    }
    return this.makeJsonRpcCall<Object, string>(method, params)
  }

  validateAddress(currency: string, address: string): Promise<{ result: false; message: string }> {
    const method = 'validateAddress'
    const params = {
      currency,
      address
    }
    return this.makeJsonRpcCall<Object, { result: false; message: string }>(method, params)
  }

  createTransaction(fromCurrency: string, toCurrency: string, address: string, amount: string): Promise<CreateTransactionResponse> {
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
