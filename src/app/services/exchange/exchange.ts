import { BehaviorSubject } from 'rxjs'
import { HttpClient } from '@angular/common/http'
import { Injectable } from '@angular/core'
import { Exchange } from './exchange.interface'
import { CreateTransactionResponse, ChangellyExchange } from './exchange.changelly'
import { ChangeNowExchange } from './exchange.changenow'

@Injectable({
  providedIn: 'root'
})
export class ExchangeProvider implements Exchange {
  private exchange: Exchange
  private exchangeSubject: BehaviorSubject<string> = new BehaviorSubject('ChangeNow')

  constructor(public http: HttpClient) {
    this.exchangeSubject.subscribe(exchange => {
      switch (exchange) {
        case 'Changelly':
          this.exchange = new ChangellyExchange(this.http)
          break
        case 'ChangeNow':
          this.exchange = new ChangeNowExchange(this.http)
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
    console.log('getExchangeAmount', this.exchange)
    return this.exchange.getExchangeAmount(fromCurrency, toCurrency, amount)
  }

  public validateAddress(currency: string, address: string): Promise<{ result: false; message: string }> {
    return this.exchange.validateAddress(currency, address)
  }

  public createTransaction(fromCurrency: string, toCurrency: string, address: string, amount: string): Promise<CreateTransactionResponse> {
    return this.exchange.createTransaction(fromCurrency, toCurrency, address, amount)
  }

  public getStatus(transactionId: string): Promise<any> {
    return this.exchange.getStatus(transactionId)
  }

  public setActiveExchange(exchange: string) {
    this.exchangeSubject.next(exchange)
  }

  public getActiveExchange() {
    return this.exchangeSubject.asObservable()
  }
}
