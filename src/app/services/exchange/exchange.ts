import { BigNumber } from 'bignumber.js'
import { BehaviorSubject } from 'rxjs'
import { HttpClient } from '@angular/common/http'
import { Exchange } from './exchange.interface'
import { ChangellyExchange } from './exchange.changelly'
import { ChangeNowExchange } from './exchange.changenow'
import { CustomExchangeService } from '../custom-exchange/custom-exchange.service'
import { Injectable } from '@angular/core'
import { StorageProvider, SettingsKey } from '../storage/storage'

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

export interface PendingExchangeTransaction {
  receivingAddress: string
  sendingAddress: string
  fromCurrency: string
  toCurrency: string
  amountExpectedFrom: BigNumber
  amountExpectedTo: string
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
  private exchangeSubject: BehaviorSubject<string> = new BehaviorSubject('ChangeNow')

  private pendingTransactions: PendingExchangeTransaction[] = []

  constructor(
    public http: HttpClient,
    private readonly customExchangeService: CustomExchangeService,
    private readonly storageProvider: StorageProvider
  ) {
    this.loadPendingTranscationsFromStorage()
    this.exchangeSubject.subscribe(exchange => {
      switch (exchange) {
        case ExchangeEnum.CHANGELLY:
          this.exchange = new ChangellyExchange(this.http, this.customExchangeService)
          break
        case ExchangeEnum.CHANGENOW:
          this.exchange = new ChangeNowExchange(this.http, this.customExchangeService)
          break
      }
    })
  }

  public getAvailableFromCurrencies(): Promise<string[]> {
    return this.exchange.getAvailableFromCurrencies()
  }

  public getAvailableToCurrenciesForCurrency(selectedFrom: string): Promise<string[]> {
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

  public createTransaction(fromCurrency: string, toCurrency: string, address: string, amount: string): Promise<any> {
    return this.exchange.createTransaction(fromCurrency, toCurrency, address, amount)
  }

  public getStatus(transactionId: string): Promise<any> {
    return this.exchange.getStatus(transactionId)
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

  public getActiveExchange() {
    return this.exchangeSubject.asObservable()
  }

  public pushExchangeTransaction(tx: PendingExchangeTransaction) {
    this.pendingTransactions.push(tx)
    this.persist()
  }

  public transactionCompleted(tx: PendingExchangeTransaction) {
    console.log('this.pendingTransactions', this.pendingTransactions)
    const index = this.pendingTransactions.indexOf(tx)
    console.log('index', index)
    if (index > -1) {
      this.pendingTransactions.splice(index, 1)
      console.log('this.pendingTransactions after splice', this.pendingTransactions)
    }
    this.persist()
  }

  private async persist(): Promise<void> {
    return this.storageProvider.set(SettingsKey.PENDING_EXCHANGE_TRANSACTIONS, this.pendingTransactions)
  }

  private async loadPendingTranscationsFromStorage() {
    const pendingTransactions = (await this.storageProvider.get(SettingsKey.PENDING_EXCHANGE_TRANSACTIONS)) as PendingExchangeTransaction[]
    this.pendingTransactions = pendingTransactions ? pendingTransactions : []
    return
  }

  public getExchangeTransactionsByProtocol(protocolidentifier: string) {
    const filtered = this.pendingTransactions.filter(tx => tx.fromCurrency === protocolidentifier || tx.toCurrency === protocolidentifier)
    return filtered
  }
}
