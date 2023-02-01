import { AirGapMarketWallet, FeeDefaults, ProtocolSymbols } from '@airgap/coinlib-core'
import { HttpClient } from '@angular/common/http'
import { BigNumber } from 'bignumber.js'

import { OperationsProvider } from '../operations/operations'

import { Exchange, ExchangeIdentifier, ExchangeTransaction, ExchangeTransactionStatusResponse, ExchangeUI } from './exchange.interface'

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

  constructor(
    protected readonly operationsProvider: OperationsProvider,
    protected readonly http: HttpClient,
    protected readonly baseURL: string = 'https://swap.airgap.prod.gke.papers.tech/'
  ) {
    this.identifierExchangeToAirGapMap.set('rep', 'eth-erc20-repv2' as ProtocolSymbols)
    this.identifierExchangeToAirGapMap.set('usdt', 'eth-erc20-usdt' as ProtocolSymbols)
    this.identifierExchangeToAirGapMap.set('rlc', 'eth-erc20-rlc' as ProtocolSymbols)
    this.identifierExchangeToAirGapMap.set('gno', 'eth-erc20-gno' as ProtocolSymbols)
    this.identifierExchangeToAirGapMap.set('bat', 'eth-erc20-bat' as ProtocolSymbols)
    this.identifierExchangeToAirGapMap.set('bnt', 'eth-erc20-bnt' as ProtocolSymbols)
    this.identifierExchangeToAirGapMap.set('omg', 'eth-erc20-omg' as ProtocolSymbols)
    this.identifierExchangeToAirGapMap.set('zrx', 'eth-erc20-zrx' as ProtocolSymbols)
    this.identifierExchangeToAirGapMap.set('storj', 'eth-erc20-storj' as ProtocolSymbols)
    this.identifierExchangeToAirGapMap.set('nmr', 'eth-erc20-nmr' as ProtocolSymbols)
    this.identifierExchangeToAirGapMap.set('aion', 'eth-erc20-aion' as ProtocolSymbols)
    this.identifierExchangeToAirGapMap.set('ant', 'eth-erc20-ant' as ProtocolSymbols)
    this.identifierExchangeToAirGapMap.set('bnb', 'eth-erc20-bnb' as ProtocolSymbols)
    this.identifierExchangeToAirGapMap.set('busd', 'eth-erc20-busd' as ProtocolSymbols)
    this.identifierExchangeToAirGapMap.set('cro', 'eth-erc20-cro' as ProtocolSymbols)
    this.identifierExchangeToAirGapMap.set('dai', 'eth-erc20-dai' as ProtocolSymbols)
    this.identifierExchangeToAirGapMap.set('enj', 'eth-erc20-enj' as ProtocolSymbols)
    this.identifierExchangeToAirGapMap.set('fet', 'eth-erc20-fet' as ProtocolSymbols)
    this.identifierExchangeToAirGapMap.set('fet', 'eth-erc20-fet-new' as ProtocolSymbols)
    this.identifierExchangeToAirGapMap.set('ht', 'eth-erc20-ht' as ProtocolSymbols)
    this.identifierExchangeToAirGapMap.set('knc', 'eth-erc20-knc' as ProtocolSymbols)
    this.identifierExchangeToAirGapMap.set('lrc', 'eth-erc20-lrc' as ProtocolSymbols)
    this.identifierExchangeToAirGapMap.set('mana', 'eth-erc20-mana' as ProtocolSymbols)
    this.identifierExchangeToAirGapMap.set('mco', 'eth-erc20-mco' as ProtocolSymbols)
    this.identifierExchangeToAirGapMap.set('mkr', 'eth-erc20-mkr' as ProtocolSymbols)
    this.identifierExchangeToAirGapMap.set('pax', 'eth-erc20-pax' as ProtocolSymbols)
    this.identifierExchangeToAirGapMap.set('paxg', 'eth-erc20-paxg' as ProtocolSymbols)
    this.identifierExchangeToAirGapMap.set('tusd', 'eth-erc20-tusd' as ProtocolSymbols)
    this.identifierExchangeToAirGapMap.set('usdc', 'eth-erc20-usdc' as ProtocolSymbols)
    this.identifierExchangeToAirGapMap.set('vet', 'eth-erc20-ven' as ProtocolSymbols)

    this.identifierAirGapToExchangeMap.set('eth-erc20-repv2' as ProtocolSymbols, 'rep')
    this.identifierAirGapToExchangeMap.set('eth-erc20-usdt' as ProtocolSymbols, 'usdt')
    this.identifierAirGapToExchangeMap.set('eth-erc20-rlc' as ProtocolSymbols, 'rlc')
    this.identifierAirGapToExchangeMap.set('eth-erc20-gno' as ProtocolSymbols, 'gno')
    this.identifierAirGapToExchangeMap.set('eth-erc20-bat' as ProtocolSymbols, 'bat')
    this.identifierAirGapToExchangeMap.set('eth-erc20-bnt' as ProtocolSymbols, 'bnt')
    this.identifierAirGapToExchangeMap.set('eth-erc20-omg' as ProtocolSymbols, 'omg')
    this.identifierAirGapToExchangeMap.set('eth-erc20-zrx' as ProtocolSymbols, 'zrx')
    this.identifierAirGapToExchangeMap.set('eth-erc20-storj' as ProtocolSymbols, 'storj')
    this.identifierAirGapToExchangeMap.set('eth-erc20-nmr' as ProtocolSymbols, 'nmr')
    this.identifierAirGapToExchangeMap.set('eth-erc20-aion' as ProtocolSymbols, 'aion')
    this.identifierAirGapToExchangeMap.set('eth-erc20-ant' as ProtocolSymbols, 'ant')
    this.identifierAirGapToExchangeMap.set('eth-erc20-bnb' as ProtocolSymbols, 'bnb')
    this.identifierAirGapToExchangeMap.set('eth-erc20-busd' as ProtocolSymbols, 'busd')
    this.identifierAirGapToExchangeMap.set('eth-erc20-cro' as ProtocolSymbols, 'cro')
    this.identifierAirGapToExchangeMap.set('eth-erc20-dai' as ProtocolSymbols, 'dai')
    this.identifierAirGapToExchangeMap.set('eth-erc20-enj' as ProtocolSymbols, 'enj')
    this.identifierAirGapToExchangeMap.set('eth-erc20-fet' as ProtocolSymbols, 'fet')
    this.identifierAirGapToExchangeMap.set('eth-erc20-fet-new' as ProtocolSymbols, 'fet')
    this.identifierAirGapToExchangeMap.set('eth-erc20-ht' as ProtocolSymbols, 'ht')
    this.identifierAirGapToExchangeMap.set('eth-erc20-knc' as ProtocolSymbols, 'knc')
    this.identifierAirGapToExchangeMap.set('eth-erc20-lrc' as ProtocolSymbols, 'lrc')
    this.identifierAirGapToExchangeMap.set('eth-erc20-mana' as ProtocolSymbols, 'mana')
    this.identifierAirGapToExchangeMap.set('eth-erc20-mco' as ProtocolSymbols, 'mco')
    this.identifierAirGapToExchangeMap.set('eth-erc20-mkr' as ProtocolSymbols, 'mkr')
    this.identifierAirGapToExchangeMap.set('eth-erc20-pax' as ProtocolSymbols, 'pax')
    this.identifierAirGapToExchangeMap.set('eth-erc20-paxg' as ProtocolSymbols, 'paxg')
    this.identifierAirGapToExchangeMap.set('eth-erc20-tusd' as ProtocolSymbols, 'tusd')
    this.identifierAirGapToExchangeMap.set('eth-erc20-usdc' as ProtocolSymbols, 'usdc')
    this.identifierAirGapToExchangeMap.set('eth-erc20-ven' as ProtocolSymbols, 'vet')
  }

  public async makeJsonRpcCall<T, R>(method: string, params: T): Promise<R> {
    const wrapper: JsonRpcWrapper<T> = {
      id: Math.random().toString(36).substring(6),
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

  public async getMaxExchangeAmountForCurrency(_fromCurrency: string, _toCurrency: string): Promise<string | undefined> {
    return undefined
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

  public async estimateFee(
    fromWallet: AirGapMarketWallet,
    _toWallet: AirGapMarketWallet,
    amount: string,
    _data: any
  ): Promise<FeeDefaults | undefined> {
    const shiftedAmount = new BigNumber(amount).shiftedBy(fromWallet.protocol.decimals)
    const isAmountValid = !shiftedAmount.isNaN() && shiftedAmount.gt(0)

    return isAmountValid ? this.operationsProvider.estimateFees(fromWallet, fromWallet.addresses[0], shiftedAmount) : undefined
  }

  public async createTransaction(
    fromWallet: AirGapMarketWallet,
    toWallet: AirGapMarketWallet,
    amount: string,
    fee: string,
    _data: any
  ): Promise<ExchangeTransaction> {
    const transformedFromCurrency: ExchangeIdentifier = this.convertAirGapIdentifierToExchangeIdentifier([
      fromWallet.protocol.identifier
    ])[0]
    const transformedToCurrency: ExchangeIdentifier = this.convertAirGapIdentifierToExchangeIdentifier([toWallet.protocol.identifier])[0]

    const method: string = 'createTransaction'

    const response: CreateTransactionResponse = await this.makeJsonRpcCall<Object, CreateTransactionResponse>(method, {
      from: transformedFromCurrency,
      to: transformedToCurrency,
      address: toWallet.receivingPublicAddress,
      amount
    })

    return {
      id: response.id,
      payoutAddress: response.payoutAddress,
      payinAddress: response.payinAddress,
      amountExpectedFrom: response.amountExpectedFrom,
      amountExpectedTo: response.amountExpectedTo,
      fee,
      exchangeResult: response,
      memo: response.payinExtraId
    }
  }

  public async getStatus(transactionId: string): Promise<ExchangeTransactionStatusResponse> {
    const method: string = 'getStatus'

    const statusString: string = await this.makeJsonRpcCall<Object, string>(method, {
      id: transactionId
    })

    return new ChangellyTransactionStatusResponse(statusString)
  }

  public async getCustomUI(): Promise<ExchangeUI> {
    return { widgets: [] }
  }

  public async getCustomData(_input: unknown): Promise<void> {
    return
  }
}

export class ChangellyExchange extends ChangellyApi implements Exchange {
  constructor(operationsProvider: OperationsProvider, http: HttpClient) {
    super(operationsProvider, http)
  }

  public async getAvailableToCurrenciesForCurrency(selectedFrom: ProtocolSymbols): Promise<ProtocolSymbols[]> {
    const availableCurrencies: ProtocolSymbols[] = await this.getAvailableFromCurrencies()

    return availableCurrencies.filter((availableCurrency: ProtocolSymbols) => availableCurrency !== selectedFrom)
  }
}
