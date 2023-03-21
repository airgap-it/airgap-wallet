import { AirGapMarketWallet, FeeDefaults, MainProtocolSymbols, ProtocolSymbols } from '@airgap/coinlib-core'
import { HttpClient } from '@angular/common/http'
import { BigNumber } from 'bignumber.js'

import { OperationsProvider } from '../operations/operations'

import { Exchange, ExchangeIdentifier, ExchangeTransaction, ExchangeTransactionStatusResponse, ExchangeUI } from './exchange.interface'

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
  payinExtraId: string
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

  constructor(
    protected readonly operationsProvider: OperationsProvider,
    protected readonly http: HttpClient,
    protected readonly baseURL: string = 'https://changenow.io/api/v1'
  ) {
    this.identifierExchangeToAirGapMap.set('xchf', 'eth-erc20-xchf' as ProtocolSymbols)
    this.identifierExchangeToAirGapMap.set('usdterc20', 'eth-erc20-usdt' as ProtocolSymbols)
    this.identifierExchangeToAirGapMap.set('bnbmainnet', 'eth-erc20-bnb' as ProtocolSymbols)
    this.identifierExchangeToAirGapMap.set('link', 'eth-erc20-link' as ProtocolSymbols)
    this.identifierExchangeToAirGapMap.set('cro', 'eth-erc20-cro' as ProtocolSymbols)
    this.identifierExchangeToAirGapMap.set('usdc', 'eth-erc20-usdc' as ProtocolSymbols)
    this.identifierExchangeToAirGapMap.set('yfi', 'eth-erc20-yfi' as ProtocolSymbols)
    this.identifierExchangeToAirGapMap.set('ht', 'eth-erc20-ht' as ProtocolSymbols)
    this.identifierExchangeToAirGapMap.set('vet', 'eth-erc20-ven' as ProtocolSymbols)
    this.identifierExchangeToAirGapMap.set('wbtc', 'eth-erc20-wbtc' as ProtocolSymbols)
    this.identifierExchangeToAirGapMap.set('dai', 'eth-erc20-dai' as ProtocolSymbols)
    this.identifierExchangeToAirGapMap.set('tusd', 'eth-erc20-tusd' as ProtocolSymbols)
    this.identifierExchangeToAirGapMap.set('mkr', 'eth-erc20-mkr' as ProtocolSymbols)
    this.identifierExchangeToAirGapMap.set('snx', 'eth-erc20-snx' as ProtocolSymbols)
    this.identifierExchangeToAirGapMap.set('theta', 'eth-erc20-theta' as ProtocolSymbols)
    this.identifierExchangeToAirGapMap.set('omg', 'eth-erc20-omg' as ProtocolSymbols)
    this.identifierExchangeToAirGapMap.set('comp', 'eth-erc20-comp' as ProtocolSymbols)
    this.identifierExchangeToAirGapMap.set('busd', 'eth-erc20-busd' as ProtocolSymbols)
    this.identifierExchangeToAirGapMap.set('bat', 'eth-erc20-bat' as ProtocolSymbols)
    this.identifierExchangeToAirGapMap.set('zrx', 'eth-erc20-zrx' as ProtocolSymbols)
    this.identifierExchangeToAirGapMap.set('lrc', 'eth-erc20-lrc' as ProtocolSymbols)
    this.identifierExchangeToAirGapMap.set('pax', 'eth-erc20-pax' as ProtocolSymbols)
    this.identifierExchangeToAirGapMap.set('knc', 'eth-erc20-knc' as ProtocolSymbols)
    this.identifierExchangeToAirGapMap.set('rep', 'eth-erc20-repv2' as ProtocolSymbols)
    this.identifierExchangeToAirGapMap.set('sushi', 'eth-erc20-sushi' as ProtocolSymbols)
    this.identifierExchangeToAirGapMap.set('band', 'eth-erc20-band' as ProtocolSymbols)
    this.identifierExchangeToAirGapMap.set('ant', 'eth-erc20-ant' as ProtocolSymbols)
    this.identifierExchangeToAirGapMap.set('bal', 'eth-erc20-bal' as ProtocolSymbols)
    this.identifierExchangeToAirGapMap.set('husd', 'eth-erc20-husd' as ProtocolSymbols)
    this.identifierExchangeToAirGapMap.set('enj', 'eth-erc20-enj' as ProtocolSymbols)
    this.identifierExchangeToAirGapMap.set('mana', 'eth-erc20-mana' as ProtocolSymbols)
    this.identifierExchangeToAirGapMap.set('sxp', 'eth-erc20-sxp' as ProtocolSymbols)
    this.identifierExchangeToAirGapMap.set('gnt', 'eth-erc20-gnt' as ProtocolSymbols)
    this.identifierExchangeToAirGapMap.set('iost', 'eth-erc20-iost' as ProtocolSymbols)
    this.identifierExchangeToAirGapMap.set('srm', 'eth-erc20-srm' as ProtocolSymbols)
    this.identifierExchangeToAirGapMap.set('hot', 'eth-erc20-hot' as ProtocolSymbols)
    this.identifierExchangeToAirGapMap.set('snt', 'eth-erc20-snt' as ProtocolSymbols)
    this.identifierExchangeToAirGapMap.set('rlc', 'eth-erc20-rlc' as ProtocolSymbols)
    this.identifierExchangeToAirGapMap.set('storj', 'eth-erc20-storj' as ProtocolSymbols)
    this.identifierExchangeToAirGapMap.set('utk', 'eth-erc20-utk' as ProtocolSymbols)
    this.identifierExchangeToAirGapMap.set('mco', 'eth-erc20-mco' as ProtocolSymbols)
    this.identifierExchangeToAirGapMap.set('bnt', 'eth-erc20-bnt' as ProtocolSymbols)
    this.identifierExchangeToAirGapMap.set('nexo', 'eth-erc20-nexo' as ProtocolSymbols)
    this.identifierExchangeToAirGapMap.set('elf', 'eth-erc20-elf' as ProtocolSymbols)
    this.identifierExchangeToAirGapMap.set('dia', 'eth-erc20-dia' as ProtocolSymbols)
    this.identifierExchangeToAirGapMap.set('agi', 'eth-erc20-agi' as ProtocolSymbols)
    this.identifierExchangeToAirGapMap.set('fet', 'eth-erc20-fet' as ProtocolSymbols)
    this.identifierExchangeToAirGapMap.set('fet', 'eth-erc20-fet-new' as ProtocolSymbols)
    this.identifierExchangeToAirGapMap.set('waxp', 'eth-erc20-wax' as ProtocolSymbols)
    this.identifierExchangeToAirGapMap.set('aion', 'eth-erc20-aion' as ProtocolSymbols)
    this.identifierExchangeToAirGapMap.set('atom', MainProtocolSymbols.COSMOS)
    this.identifierExchangeToAirGapMap.set('dot', MainProtocolSymbols.POLKADOT)
    this.identifierExchangeToAirGapMap.set('ksm', MainProtocolSymbols.KUSAMA)
    this.identifierExchangeToAirGapMap.set('btc', MainProtocolSymbols.BTC_SEGWIT)

    this.identifierAirGapToExchangeMap.set('eth-erc20-xchf' as ProtocolSymbols, 'xchf')
    this.identifierAirGapToExchangeMap.set('eth-erc20-usdt' as ProtocolSymbols, 'usdterc20')
    this.identifierAirGapToExchangeMap.set('eth-erc20-bnb' as ProtocolSymbols, 'bnbmainnet')
    this.identifierAirGapToExchangeMap.set('eth-erc20-link' as ProtocolSymbols, 'link')
    this.identifierAirGapToExchangeMap.set('eth-erc20-cro' as ProtocolSymbols, 'cro')
    this.identifierAirGapToExchangeMap.set('eth-erc20-usdc' as ProtocolSymbols, 'usdc')
    this.identifierAirGapToExchangeMap.set('eth-erc20-yfi' as ProtocolSymbols, 'yfi')
    this.identifierAirGapToExchangeMap.set('eth-erc20-ht' as ProtocolSymbols, 'ht')
    this.identifierAirGapToExchangeMap.set('eth-erc20-ven' as ProtocolSymbols, 'vet')
    this.identifierAirGapToExchangeMap.set('eth-erc20-wbtc' as ProtocolSymbols, 'wbtc')
    this.identifierAirGapToExchangeMap.set('eth-erc20-dai' as ProtocolSymbols, 'dai')
    this.identifierAirGapToExchangeMap.set('eth-erc20-tusd' as ProtocolSymbols, 'tusd')
    this.identifierAirGapToExchangeMap.set('eth-erc20-mkr' as ProtocolSymbols, 'mkr')
    this.identifierAirGapToExchangeMap.set('eth-erc20-snx' as ProtocolSymbols, 'snx')
    this.identifierAirGapToExchangeMap.set('eth-erc20-theta' as ProtocolSymbols, 'theta')
    this.identifierAirGapToExchangeMap.set('eth-erc20-mkr' as ProtocolSymbols, 'mkr')
    this.identifierAirGapToExchangeMap.set('eth-erc20-omg' as ProtocolSymbols, 'omg')
    this.identifierAirGapToExchangeMap.set('eth-erc20-comp' as ProtocolSymbols, 'comp')
    this.identifierAirGapToExchangeMap.set('eth-erc20-busd' as ProtocolSymbols, 'busd')
    this.identifierAirGapToExchangeMap.set('eth-erc20-bat' as ProtocolSymbols, 'bat')
    this.identifierAirGapToExchangeMap.set('eth-erc20-zrx' as ProtocolSymbols, 'zrx')
    this.identifierAirGapToExchangeMap.set('eth-erc20-lrc' as ProtocolSymbols, 'lrc')
    this.identifierAirGapToExchangeMap.set('eth-erc20-pax' as ProtocolSymbols, 'pax')
    this.identifierAirGapToExchangeMap.set('eth-erc20-knc' as ProtocolSymbols, 'knc')
    this.identifierAirGapToExchangeMap.set('eth-erc20-repv2' as ProtocolSymbols, 'rep')
    this.identifierAirGapToExchangeMap.set('eth-erc20-sushi' as ProtocolSymbols, 'sushi')
    this.identifierAirGapToExchangeMap.set('eth-erc20-band' as ProtocolSymbols, 'band')
    this.identifierAirGapToExchangeMap.set('eth-erc20-ant' as ProtocolSymbols, 'ant')
    this.identifierAirGapToExchangeMap.set('eth-erc20-bal' as ProtocolSymbols, 'bal')
    this.identifierAirGapToExchangeMap.set('eth-erc20-husd' as ProtocolSymbols, 'husd')
    this.identifierAirGapToExchangeMap.set('eth-erc20-enj' as ProtocolSymbols, 'enj')
    this.identifierAirGapToExchangeMap.set('eth-erc20-mana' as ProtocolSymbols, 'mana')
    this.identifierAirGapToExchangeMap.set('eth-erc20-sxp' as ProtocolSymbols, 'sxp')
    this.identifierAirGapToExchangeMap.set('eth-erc20-gnt' as ProtocolSymbols, 'gnt')
    this.identifierAirGapToExchangeMap.set('eth-erc20-iost' as ProtocolSymbols, 'iost')
    this.identifierAirGapToExchangeMap.set('eth-erc20-srm' as ProtocolSymbols, 'srm')
    this.identifierAirGapToExchangeMap.set('eth-erc20-hot' as ProtocolSymbols, 'hot')
    this.identifierAirGapToExchangeMap.set('eth-erc20-snt' as ProtocolSymbols, 'snt')
    this.identifierAirGapToExchangeMap.set('eth-erc20-rlc' as ProtocolSymbols, 'rlc')
    this.identifierAirGapToExchangeMap.set('eth-erc20-storj' as ProtocolSymbols, 'storj')
    this.identifierAirGapToExchangeMap.set('eth-erc20-utk' as ProtocolSymbols, 'utk')
    this.identifierAirGapToExchangeMap.set('eth-erc20-mco' as ProtocolSymbols, 'mco')
    this.identifierAirGapToExchangeMap.set('eth-erc20-bnt' as ProtocolSymbols, 'bnt')
    this.identifierAirGapToExchangeMap.set('eth-erc20-nexo' as ProtocolSymbols, 'nexo')
    this.identifierAirGapToExchangeMap.set('eth-erc20-elf' as ProtocolSymbols, 'elf')
    this.identifierAirGapToExchangeMap.set('eth-erc20-dia' as ProtocolSymbols, 'dia')
    this.identifierAirGapToExchangeMap.set('eth-erc20-agi' as ProtocolSymbols, 'agi')
    this.identifierAirGapToExchangeMap.set('eth-erc20-fet' as ProtocolSymbols, 'fet')
    this.identifierAirGapToExchangeMap.set('eth-erc20-fet-new' as ProtocolSymbols, 'fet')
    this.identifierAirGapToExchangeMap.set('eth-erc20-wax' as ProtocolSymbols, 'waxp')
    this.identifierAirGapToExchangeMap.set('eth-erc20-aion' as ProtocolSymbols, 'aion')
    this.identifierAirGapToExchangeMap.set(MainProtocolSymbols.COSMOS, 'atom')
    this.identifierAirGapToExchangeMap.set(MainProtocolSymbols.POLKADOT, 'dot')
    this.identifierAirGapToExchangeMap.set(MainProtocolSymbols.KUSAMA, 'ksm')
    this.identifierAirGapToExchangeMap.set(MainProtocolSymbols.BTC_SEGWIT, 'btc')
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

  public async getMaxExchangeAmountForCurrency(_fromCurrency: string, _toCurrency: string): Promise<string | undefined> {
    return '0'
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

    const apiKey: string = '5eca82aabfdf9684e8fe4ff35245d9d4f2cbb1153e0f1025b697941c982763d1'

    const response: TransactionChangeNowResponse = await this.http
      .post<TransactionChangeNowResponse>(`${this.baseURL}/transactions/${apiKey}`, {
        from: transformedFromCurrency,
        to: transformedToCurrency,
        address: toWallet.receivingPublicAddress,
        amount,
        extraId: '',
        userId: '',
        contactEmail: '',
        refundAddress: fromWallet.receivingPublicAddress,
        refundExtraId: ''
      })
      .toPromise()

    return {
      id: response.id,
      payoutAddress: response.payoutAddress,
      payinAddress: response.payinAddress,
      amountExpectedFrom: amount,
      amountExpectedTo: response.amount.toString(),
      fee,
      exchangeResult: response,
      memo: response.payinExtraId
    }
  }

  public async getStatus(transactionId: string): Promise<ChangeNowTransactionStatusResponse> {
    const response: ChangeNowTransactionStatus = await this.http
      .get<ChangeNowTransactionStatus>(`${this.baseURL}/transactions/${transactionId}/changenow`)
      .toPromise()

    return new ChangeNowTransactionStatusResponse(response)
  }

  public async getCustomUI(): Promise<ExchangeUI> {
    return { widgets: [] }
  }

  public async getCustomData(_input: unknown): Promise<void> {
    return
  }
}

export class ChangeNowExchange extends ChangeNowApi implements Exchange {
  constructor(operationsProvider: OperationsProvider, http: HttpClient) {
    super(operationsProvider, http)
  }

  public async getAvailableToCurrenciesForCurrency(fromCurrency: ProtocolSymbols): Promise<ProtocolSymbols[]> {
    const transformedFromCurrency: ExchangeIdentifier = this.convertAirGapIdentifierToExchangeIdentifier([fromCurrency])[0].toLowerCase()

    const result: CurrencyDetailResponse[] = await this.http
      .get<CurrencyDetailResponse[]>(`${this.baseURL}/currencies-to/${transformedFromCurrency}`)
      .toPromise()

    const identifiers: ExchangeIdentifier[] = result
      .filter((currency: CurrencyDetailResponse) => currency.isAvailable)
      .map((currency: CurrencyDetailResponse) => currency.ticker)

    return this.convertExchangeIdentifierToAirGapIdentifier(identifiers)
  }
}
