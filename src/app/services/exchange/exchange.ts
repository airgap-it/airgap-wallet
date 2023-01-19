import { ProtocolService } from '@airgap/angular-core'
import { AirGapMarketWallet, FeeDefaults, IAirGapTransaction, ProtocolSymbols } from '@airgap/coinlib-core'
import { HttpClient } from '@angular/common/http'
import { Injectable } from '@angular/core'
import { FormBuilder } from '@angular/forms'
import { Store } from '@ngrx/store'
import { BigNumber } from 'bignumber.js'
import { BehaviorSubject, Observable } from 'rxjs'
import { take, tap } from 'rxjs/operators'

import { OperationsProvider } from '../operations/operations'
import { WalletStorageKey, WalletStorageService } from '../storage/storage'

import { ChangellyExchange } from './exchange.changelly'
import { ChangeNowExchange } from './exchange.changenow'
import { Exchange, ExchangeTransaction, ExchangeTransactionStatusResponse, ExchangeUI } from './exchange.interface'
import { LiquidityExchange } from './exchange.liquidity'
import { QuipuswapExchange } from './exchange.quipuswap'
import * as fromExchange from '../../pages/exchange/reducer'
import * as actions from '../../app.actions'
import { PlentyExchange } from './exchange.plenty'

export enum SwapExchangeEnum {
  CHANGENOW = 'ChangeNow',
  CHANGELLY = 'Changelly',
  QUIPUSWAP = 'Quipuswap',
  PLENTY = 'Plenty'
}

export enum LiquidityExchangeEnum {
  SIRIUS = 'Sirius'
}

export type ExchangeEnum = SwapExchangeEnum | LiquidityExchangeEnum

export enum TransactionStatus {
  NEW = 'NEW',
  WAITING = 'WAITING',
  CONFORMING = 'CONFORMING',
  EXCHANGING = 'EXCHANGING',
  SENDING = 'SENDING',
  FINISHED = 'FINISHED',
  FAILED = 'FAILED'
}

export interface ExchangeTransactionDetails {
  receivingAddress: string
  sendingAddress: string
  fromCurrency: ProtocolSymbols
  toCurrency: ProtocolSymbols
  amountExpectedFrom: BigNumber
  amountExpectedTo: string
  fee: string
  status: string
  exchange: ExchangeEnum
  id: string
  timestamp: number
}

@Injectable({
  providedIn: 'root'
})
export class ExchangeProvider implements Exchange {
  private exchange: Exchange
  private exchangeIdentifier: ExchangeEnum
  private readonly exchangeObservable: Observable<ExchangeEnum>
  private readonly exchangeSubject: BehaviorSubject<ExchangeEnum> = new BehaviorSubject<ExchangeEnum>(SwapExchangeEnum.CHANGENOW)

  private pendingTransactions: ExchangeTransactionDetails[] = []

  constructor(
    public http: HttpClient,
    private readonly storageService: WalletStorageService,
    private readonly protocolService: ProtocolService,
    private readonly operationsProvider: OperationsProvider,
    private readonly formBuilder: FormBuilder,
    protected readonly store$: Store<fromExchange.State>
  ) {
    this.loadPendingTranscationsFromStorage()

    this.exchangeObservable = this.exchangeSubject.pipe(
      tap((exchange: ExchangeEnum) => {
        // tslint:disable-next-line: switch-default
        switch (exchange) {
          case SwapExchangeEnum.CHANGELLY:
            this.exchange = new ChangellyExchange(this.operationsProvider, this.http)
            this.exchangeIdentifier = SwapExchangeEnum.CHANGELLY
            break
          case SwapExchangeEnum.CHANGENOW:
            this.exchange = new ChangeNowExchange(this.operationsProvider, this.http)
            this.exchangeIdentifier = SwapExchangeEnum.CHANGENOW
            break
          case SwapExchangeEnum.QUIPUSWAP:
            this.exchange = new QuipuswapExchange(this.protocolService, this.formBuilder, store$)
            this.exchangeIdentifier = SwapExchangeEnum.QUIPUSWAP
            break
          case SwapExchangeEnum.PLENTY:
            this.exchange = new PlentyExchange(this.protocolService, this.formBuilder, store$)
            this.exchangeIdentifier = SwapExchangeEnum.PLENTY
            break
          case LiquidityExchangeEnum.SIRIUS:
            this.exchange = new LiquidityExchange(this.protocolService, this.formBuilder, store$)
            this.exchangeIdentifier = LiquidityExchangeEnum.SIRIUS
        }
      })
    )
  }

  public async getAvailableFromCurrencies(): Promise<ProtocolSymbols[]> {
    return this.exchange.getAvailableFromCurrencies()
  }

  public async getAvailableToCurrenciesForCurrency(selectedFrom: string): Promise<ProtocolSymbols[]> {
    return this.exchange.getAvailableToCurrenciesForCurrency(selectedFrom)
  }

  public async getMinAmountForCurrency(fromCurrency: string, toCurrency: string): Promise<string> {
    return this.exchange.getMinAmountForCurrency(fromCurrency, toCurrency)
  }

  public async getMaxExchangeAmountForCurrency(fromCurrency: string, toCurrency: string): Promise<string | undefined> {
    return this.exchange.getMaxExchangeAmountForCurrency(fromCurrency, toCurrency)
  }

  public async getExchangeAmount(fromCurrency: string, toCurrency: string, amount: string): Promise<string> {
    return this.exchange.getExchangeAmount(fromCurrency, toCurrency, amount)
  }

  public async validateAddress(currency: string, address: string): Promise<{ result: false; message: string }> {
    return this.exchange.validateAddress(currency, address)
  }

  public numberOfAvailableSwapExchanges(): number {
    return Object.keys(SwapExchangeEnum).length
  }

  public async estimateFee(
    fromWallet: AirGapMarketWallet,
    toWallet: AirGapMarketWallet,
    amount: string,
    data: any
  ): Promise<FeeDefaults | undefined> {
    return this.exchange.estimateFee(fromWallet, toWallet, amount, data)
  }

  public async createTransaction(
    _fromWallet: AirGapMarketWallet,
    _toWallet: AirGapMarketWallet,
    _amount: string,
    fee: string,
    data: any
  ): Promise<ExchangeTransaction> {
    const fromWallet = await this.store$
      .select((state) => state.exchange.fromWallet)
      .pipe(take(1))
      .toPromise()

    const toWallet = await this.store$
      .select((state) => state.exchange.toWallet)
      .pipe(take(1))
      .toPromise()

    const amount = await this.store$
      .select((state) => state.exchange.amount)
      .pipe(take(1))
      .toPromise()

    return this.exchange.createTransaction(fromWallet, toWallet, amount.toString(), fee, data)
  }

  public getStatus(transactionId: string): Promise<ExchangeTransactionStatusResponse> {
    return this.exchange.getStatus(transactionId)
  }

  public getStatusForTransaction(transaction: ExchangeTransactionDetails): Promise<ExchangeTransactionStatusResponse> {
    return this.exchange.getStatus(transaction.id)
  }

  public convertExchangeIdentifierToAirGapIdentifier(identifiers: string[]): string[] {
    return this.exchange.convertExchangeIdentifierToAirGapIdentifier(identifiers)
  }

  public convertAirGapIdentifierToExchangeIdentifier(identifiers: string[]): string[] {
    return this.exchange.convertAirGapIdentifierToExchangeIdentifier(identifiers)
  }

  public async getCustomUI(): Promise<ExchangeUI> {
    return this.exchange.getCustomUI()
  }
  public async getCustomData(input: unknown): Promise<unknown> {
    return this.exchange.getCustomData(input)
  }

  public setActiveExchange(exchange: ExchangeEnum) {
    this.exchangeSubject.next(exchange)
  }

  public switchActiveExchange() {
    const supportedExchanges = Object.values(SwapExchangeEnum)
    const activeIndex = supportedExchanges.indexOf(this.exchangeIdentifier as SwapExchangeEnum)
    const nextIndex = (activeIndex + 1) % supportedExchanges.length
    this.setActiveExchange(supportedExchanges[nextIndex])
  }

  public getActiveExchange(): Observable<ExchangeEnum | LiquidityExchangeEnum> {
    return this.exchangeObservable
  }

  public pushExchangeTransaction(tx: ExchangeTransactionDetails) {
    this.pendingTransactions.push(tx)
    this.persist()
  }

  public async formatExchangeTxs(
    pendingExchangeTxs: ExchangeTransactionDetails[],
    protocolIdentifier: ProtocolSymbols
  ): Promise<IAirGapTransaction[]> {
    if (pendingExchangeTxs.length === 0) {
      return []
    }
    const protocol = await this.protocolService.getProtocol(protocolIdentifier)
    return pendingExchangeTxs.map((tx) => {
      const rawAmount = new BigNumber(protocolIdentifier === tx.toCurrency ? tx.amountExpectedTo : tx.amountExpectedFrom)
      const formattedAmount = rawAmount.times(10 ** protocol.decimals).toString()
      return {
        from: [tx.sendingAddress],
        to: [tx.receivingAddress],
        isInbound: protocolIdentifier === tx.toCurrency ? true : false,
        amount: formattedAmount,
        fee: new BigNumber(tx.fee).shiftedBy(protocol.decimals).toFixed(),
        timestamp: new BigNumber(tx.timestamp).dividedToIntegerBy(1000).toNumber(),
        protocolIdentifier: protocolIdentifier === tx.toCurrency ? tx.toCurrency : tx.fromCurrency,
        network: protocol.options.network,
        extra: tx.status
      }
    })
  }

  public transactionCompleted(tx: ExchangeTransactionDetails) {
    const index = this.pendingTransactions.indexOf(tx)
    if (index > -1) {
      this.pendingTransactions.splice(index, 1)
    }
    this.persist()
  }

  private async persist(): Promise<void> {
    return this.storageService.set(WalletStorageKey.PENDING_EXCHANGE_TRANSACTIONS, this.pendingTransactions)
  }

  private async loadPendingTranscationsFromStorage() {
    const pendingTransactions = (await this.storageService.get(
      WalletStorageKey.PENDING_EXCHANGE_TRANSACTIONS
    )) as ExchangeTransactionDetails[]
    this.pendingTransactions = pendingTransactions ? pendingTransactions : []
    return
  }

  public async getExchangeTransactionsByProtocol(protocolidentifier: ProtocolSymbols, address: string): Promise<IAirGapTransaction[]> {
    const filteredByProtocol = this.pendingTransactions.filter(
      (tx) => tx.fromCurrency === protocolidentifier || tx.toCurrency === protocolidentifier
    )
    const filteredByAddress = filteredByProtocol.filter((tx) => tx.receivingAddress === address || tx.sendingAddress === address)
    const statusPromises: Promise<{
      transaction: ExchangeTransactionDetails
      statusResponse?: ExchangeTransactionStatusResponse
    }>[] = filteredByAddress.map((tx) => {
      return this.getStatusForTransaction(tx)
        .then((result) => {
          return { transaction: tx, statusResponse: result }
        })
        .catch(() => {
          return { transaction: tx }
        })
    })
    const transactions = (await Promise.all(statusPromises))
      .filter((result) => {
        if (result.statusResponse !== undefined) {
          result.transaction.status = result.statusResponse.status
          const eightHours = 8 * 3600 * 1000
          if (
            !result.statusResponse.isPending() ||
            result.transaction.timestamp < Date.now() - eightHours ||
            result.transaction.timestamp < Date.now() - eightHours
          ) {
            this.transactionCompleted(result.transaction)
            return false
          } else {
            return true
          }
        } else {
          this.transactionCompleted(result.transaction)
          return false
        }
      })
      .map((result) => result.transaction)
    return this.formatExchangeTxs(transactions, protocolidentifier)
  }

  public setSlippage(slippage: BigNumber) {
    this.store$.dispatch(actions.setSlippage({ slippage }))
  }
}
