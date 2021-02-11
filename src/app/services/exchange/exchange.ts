import { ProtocolService } from '@airgap/angular-core'
import { HttpClient } from '@angular/common/http'
import { Injectable } from '@angular/core'
import { IAirGapTransaction } from '@airgap/coinlib-core'
import { ProtocolSymbols } from '@airgap/coinlib-core'
import { BigNumber } from 'bignumber.js'
import { BehaviorSubject } from 'rxjs'

import { WalletStorageKey, WalletStorageService } from '../storage/storage'

import { ChangellyExchange } from './exchange.changelly'
import { ChangeNowExchange } from './exchange.changenow'
import { Exchange, ExchangeTransactionStatusResponse } from './exchange.interface'

export enum ExchangeEnum {
  CHANGELLY = 'Changelly',
  CHANGENOW = 'ChangeNow'
}

export enum TransactionStatus {
  NEW = 'NEW',
  WAITING = 'WAITING',
  CONFORMING = 'CONFORMING',
  EXCHANGING = 'EXCHANGING',
  SENDING = 'SENDING',
  FINISHED = 'FINISHED',
  FAILED = 'FAILED'
}

export interface ExchangeTransaction {
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
  private exchangeSubject: BehaviorSubject<string> = new BehaviorSubject('ChangeNow')

  private pendingTransactions: ExchangeTransaction[] = []

  constructor(
    public http: HttpClient,
    private readonly storageService: WalletStorageService,
    private readonly protocolService: ProtocolService
  ) {
    this.loadPendingTranscationsFromStorage()
    this.exchangeSubject.subscribe(exchange => {
      switch (exchange) {
        case ExchangeEnum.CHANGELLY:
          this.exchange = new ChangellyExchange(this.http)
          this.exchangeIdentifier = ExchangeEnum.CHANGELLY
          break
        case ExchangeEnum.CHANGENOW:
          this.exchange = new ChangeNowExchange(this.http)
          this.exchangeIdentifier = ExchangeEnum.CHANGENOW
          break
      }
    })
  }

  public getAvailableFromCurrencies(): Promise<ProtocolSymbols[]> {
    return this.exchange.getAvailableFromCurrencies()
  }

  public getAvailableToCurrenciesForCurrency(selectedFrom: string): Promise<ProtocolSymbols[]> {
    return this.exchange.getAvailableToCurrenciesForCurrency(selectedFrom)
  }

  public getMinAmountForCurrency(fromCurrency: string, toCurrency: string): Promise<string> {
    return this.exchange.getMinAmountForCurrency(fromCurrency, toCurrency)
  }

  public getExchangeAmount(fromCurrency: string, toCurrency: string, amount: string): Promise<string> {
    return this.exchange.getExchangeAmount(fromCurrency, toCurrency, amount)
  }

  public validateAddress(currency: string, address: string): Promise<{ result: false; message: string }> {
    return this.exchange.validateAddress(currency, address)
  }

  public createTransaction(
    fromCurrency: string,
    toCurrency: string,
    toAddress: string,
    amount: string,
    fromAddress?: string
  ): Promise<any> {
    return this.exchange.createTransaction(fromCurrency, toCurrency, toAddress, amount, fromAddress)
  }

  public getStatus(transactionId: string): Promise<ExchangeTransactionStatusResponse> {
    return this.exchange.getStatus(transactionId)
  }

  public getStatusForTransaction(transaction: ExchangeTransaction): Promise<ExchangeTransactionStatusResponse> {
    switch (transaction.exchange) {
      case ExchangeEnum.CHANGELLY:
        return new ChangellyExchange(this.http).getStatus(transaction.id)
      case ExchangeEnum.CHANGENOW:
        return new ChangeNowExchange(this.http).getStatus(transaction.id)
    }
  }

  public convertExchangeIdentifierToAirGapIdentifier(identifiers: string[]): string[] {
    return this.exchange.convertExchangeIdentifierToAirGapIdentifier(identifiers)
  }

  public convertAirGapIdentifierToExchangeIdentifier(identifiers: string[]): string[] {
    return this.exchange.convertAirGapIdentifierToExchangeIdentifier(identifiers)
  }

  public setActiveExchange(exchange: string) {
    this.exchangeSubject.next(exchange)
  }

  public switchActiveExchange() {
    switch (this.exchangeIdentifier) {
      case ExchangeEnum.CHANGELLY:
        this.setActiveExchange(ExchangeEnum.CHANGENOW)
        break
      case ExchangeEnum.CHANGENOW:
        this.setActiveExchange(ExchangeEnum.CHANGELLY)
        break
    }
  }

  public getActiveExchange() {
    return this.exchangeSubject.asObservable()
  }

  public pushExchangeTransaction(tx: ExchangeTransaction) {
    this.pendingTransactions.push(tx)
    this.persist()
  }

  public async formatExchangeTxs(
    pendingExchangeTxs: ExchangeTransaction[],
    protocolIdentifier: ProtocolSymbols
  ): Promise<IAirGapTransaction[]> {
    const protocol = await this.protocolService.getProtocol(protocolIdentifier)
    return pendingExchangeTxs.map(tx => {
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

  public transactionCompleted(tx: ExchangeTransaction) {
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
    const pendingTransactions = (await this.storageService.get(WalletStorageKey.PENDING_EXCHANGE_TRANSACTIONS)) as ExchangeTransaction[]
    this.pendingTransactions = pendingTransactions ? pendingTransactions : []
    return
  }

  public async getExchangeTransactionsByProtocol(protocolidentifier: ProtocolSymbols, address: string): Promise<IAirGapTransaction[]> {
    const filteredByProtocol = this.pendingTransactions.filter(
      tx => tx.fromCurrency === protocolidentifier || tx.toCurrency === protocolidentifier
    )
    const filteredByAddress = filteredByProtocol.filter(tx => tx.receivingAddress === address || tx.sendingAddress === address)
    const statusPromises: Promise<{
      transaction: ExchangeTransaction
      statusResponse?: ExchangeTransactionStatusResponse
    }>[] = filteredByAddress.map(tx => {
      return this.getStatusForTransaction(tx)
        .then(result => {
          return { transaction: tx, statusResponse: result }
        })
        .catch(() => {
          return { transaction: tx }
        })
    })
    const transactions = (await Promise.all(statusPromises))
      .filter(result => {
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
      .map(result => result.transaction)
    return this.formatExchangeTxs(transactions, protocolidentifier)
  }
}
