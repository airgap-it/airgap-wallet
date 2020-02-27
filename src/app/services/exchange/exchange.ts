import { BigNumber } from 'bignumber.js'
import { getProtocolByIdentifier } from 'airgap-coin-lib'
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

export interface ExchangeTransaction {
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

export interface FormattedExchangeTransaction {
  from: string[]
  to: string[]
  isInbound: boolean
  amount: string
  status: string
  exchange: ExchangeEnum
  id: string
  timestamp: number
  protocolIdentifier: string
}

@Injectable({
  providedIn: 'root'
})
export class ExchangeProvider implements Exchange {
  private exchange: Exchange
  private exchangeSubject: BehaviorSubject<string> = new BehaviorSubject('ChangeNow')

  private pendingTransactions: ExchangeTransaction[] = []

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

  public pushExchangeTransaction(tx: ExchangeTransaction) {
    this.pendingTransactions.push(tx)
    this.persist()
  }

  public formatExchangeTxs(pendingExchangeTxs: ExchangeTransaction[], protocolIdentifier: string): FormattedExchangeTransaction[] {
    const protocol = getProtocolByIdentifier(protocolIdentifier)
    return pendingExchangeTxs.map(tx => {
      const rawAmount = new BigNumber(protocolIdentifier === tx.toCurrency ? tx.amountExpectedTo : tx.amountExpectedFrom)
      const formattedAmount = rawAmount.times(10 ** protocol.decimals).toString()
      return {
        from: [tx.sendingAddress],
        to: [tx.receivingAddress],
        isInbound: protocolIdentifier === tx.toCurrency ? true : false,
        amount: formattedAmount,
        status: tx.status,
        exchange: tx.exchange,
        id: tx.id,
        timestamp: tx.timestamp,
        protocolIdentifier: protocolIdentifier === tx.toCurrency ? tx.toCurrency : tx.fromCurrency
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
    return this.storageProvider.set(SettingsKey.PENDING_EXCHANGE_TRANSACTIONS, this.pendingTransactions)
  }

  private async loadPendingTranscationsFromStorage() {
    const pendingTransactions = (await this.storageProvider.get(SettingsKey.PENDING_EXCHANGE_TRANSACTIONS)) as ExchangeTransaction[]
    this.pendingTransactions = pendingTransactions ? pendingTransactions : []
    return
  }

  public getExchangeTransactionsByProtocol(protocolidentifier: string, address: string) {
    const filteredByProtocol = this.pendingTransactions.filter(
      tx => tx.fromCurrency === protocolidentifier || tx.toCurrency === protocolidentifier
    )
    const filteredByAddress = filteredByProtocol.filter(tx => tx.receivingAddress === address || tx.sendingAddress === address)
    return filteredByAddress
  }
}
