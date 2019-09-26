import { AmountConverterPipe } from './../../pipes/amount-converter/amount-converter.pipe'
import { CryptoToFiatPipe } from './../../pipes/crypto-to-fiat/crypto-to-fiat.pipe'
import { AccountProvider } from './../account/account.provider'
import { Injectable } from '@angular/core'
import { AirGapMarketWallet, IAirGapTransaction, getProtocolByIdentifier } from 'airgap-coin-lib'
import { TimeUnit, MarketDataSample } from 'airgap-coin-lib/dist/wallet/AirGapMarketWallet'
import * as cryptocompare from 'cryptocompare'
import { transition } from '@angular/animations'

export interface BalanceAtTimestampObject {
  timestamp: number
  balance: number
}

export interface TransactionHistoryObject {
  timestamp: number
  amount: number
  fee: number
  selfTx?: boolean
  isInbound: boolean
}

/*
  Generated class for the MarketDataProvider provider.

  See https://angular.io/guide/dependency-injection for more info on providers
  and Angular DI.
*/
@Injectable()
export class MarketDataService {
  constructor(public walletsProvider: AccountProvider, private readonly amountConverterPipe: AmountConverterPipe) {}

  async getTransactionHistory(wallet: AirGapMarketWallet): Promise<Array<TransactionHistoryObject>> {
    let txHistory: Array<TransactionHistoryObject> = []
    let promise = wallet.fetchTransactions(50, 0).then((transactions: Array<IAirGapTransaction>) => {
      // TODO fetch more than 50 txs?
      const protocol = getProtocolByIdentifier(wallet.protocolIdentifier)
      transactions.forEach(transaction => {
        let amount = transaction.amount.shiftedBy(-1 * protocol.decimals).toNumber()
        const fee = transaction.fee.shiftedBy(-1 * protocol.decimals).toNumber() //
        let selfTx: boolean
        if (transaction.to[0] === transaction.from[0]) {
          selfTx = true
        }
        txHistory.push({ timestamp: transaction.timestamp, amount: amount, fee: fee, isInbound: transaction.isInbound, selfTx: selfTx })
      })
    })
    await promise

    return txHistory
  }

  async fetchBalanceAfterEachTransaction(wallet: AirGapMarketWallet): Promise<Array<BalanceAtTimestampObject>> {
    let txHistory: Array<TransactionHistoryObject> = await this.getTransactionHistory(wallet)
    let balancesByTimestamp: Array<BalanceAtTimestampObject> = []

    let currentBalance = this.amountConverterPipe.transformValueOnly(wallet.currentBalance, {
      protocolIdentifier: wallet.protocolIdentifier,
      maxDigits: 10
    })

    // txHistory is sorted from most recent to oldest tx
    txHistory.forEach((transaction: TransactionHistoryObject) => {
      balancesByTimestamp.push({ timestamp: transaction.timestamp, balance: currentBalance })
      if (transaction.isInbound === false && transaction.selfTx === undefined) {
        currentBalance += transaction.amount + transaction.fee
      } else if (transaction.selfTx) {
        currentBalance += transaction.fee
      } else {
        currentBalance -= transaction.amount
      }
    })
    return balancesByTimestamp
  }

  static balanceAtTimestamp(myTimestamp: number, balancesAfterEachTransaction: Array<BalanceAtTimestampObject>): number | undefined {
    let timestamps = balancesAfterEachTransaction.map(object => object.timestamp).reverse()

    if (myTimestamp < timestamps[0] || balancesAfterEachTransaction.length === 0) {
      return 0
    }

    let closestTimestamp = timestamps[0]
    let diff = Math.abs(myTimestamp - closestTimestamp)
    for (let val = 0; val < timestamps.length; val++) {
      let newdiff = Math.abs(myTimestamp - timestamps[val])
      if (newdiff < diff && timestamps[val] < myTimestamp) {
        // we want the closest timestamp which is smaller than myTimestamp
        diff = newdiff
        closestTimestamp = timestamps[val]
      }
    }
    return balancesAfterEachTransaction.find(object => object.timestamp === closestTimestamp).balance
  }

  public fetchMarketPrices(limit: number, timeUnit, coinProtocol: string): Promise<MarketDataSample[]> {
    return new Promise((resolve, reject) => {
      this.algoSelector(limit, timeUnit, coinProtocol)
        .then(marketSample => {
          resolve(marketSample)
        })
        .catch()
    })
  }

  private algoSelector(limit: number, timeUnit: TimeUnit, coinProtocol: string): Promise<MarketDataSample[]> {
    let marketSample = []
    const baseSymbol = 'USD'
    return new Promise((resolve, reject) => {
      let promise: Promise<MarketDataSample>
      if (timeUnit === 'days') {
        promise = cryptocompare.histoDay(coinProtocol.toUpperCase(), baseSymbol, {
          // TODO set limit according to date of first transaction
          limit: limit - 1
        })
      } else if (timeUnit === 'hours') {
        promise = cryptocompare.histoHour(coinProtocol.toUpperCase(), baseSymbol, {
          limit: limit - 1
        })
      } else if (timeUnit === 'minutes') {
        promise = cryptocompare.histoMinute(coinProtocol.toUpperCase(), baseSymbol, {
          limit: limit - 1
        })
      } else {
        promise = Promise.reject('Invalid time unit')
      }
      promise
        .then(prices => {
          for (const idx in prices) {
            const marketDataObject = {
              time: prices[idx].time,
              close: prices[idx].close,
              high: prices[idx].high,
              low: prices[idx].low,
              volumefrom: prices[idx].volumefrom,
              volumeto: prices[idx].volumeto
            } as MarketDataSample
            marketSample.push(marketDataObject)
          }
          resolve(marketSample)
        })
        .catch(console.error)
    })
  }

  async fetchValuesSingleWallet(wallet: AirGapMarketWallet, interval: string): Promise<number[]> {
    let walletValues: Array<number> = []
    let priceSamples: MarketDataSample[] = []
    switch (interval) {
      case 'last24h':
        const unfiteredPriceSamples = await this.fetchMarketPrices(24 * 60, TimeUnit.Minutes, wallet.coinProtocol.marketSymbol)
        priceSamples = unfiteredPriceSamples.filter((value, index, Arr) => {
          return index % 20 === 0
        })
        break
      case 'last7d':
        priceSamples = await this.fetchMarketPrices(7 * 24, TimeUnit.Hours, wallet.coinProtocol.marketSymbol)
        break
      case 'allTime':
        priceSamples = await this.fetchMarketPrices(365, TimeUnit.Days, wallet.coinProtocol.marketSymbol)
        break
    }
    let balancesAfterEachTransaction: Array<BalanceAtTimestampObject> = await this.fetchBalanceAfterEachTransaction(wallet)
    priceSamples.forEach((priceSample: MarketDataSample) => {
      const realTimeBalance = MarketDataService.balanceAtTimestamp(priceSample.time, balancesAfterEachTransaction)
      let avgDailyPrice = (priceSample.high + priceSample.low) / 2
      walletValues.push(realTimeBalance * avgDailyPrice)
    })

    return walletValues
  }

  async fetchAllValues(interval: string): Promise<number[]> {
    let allWalletValues = [0, 0]
    for (let wallet of this.walletsProvider.getWalletList()) {
      let walletValues = await this.fetchValuesSingleWallet(wallet, interval)
      walletValues.forEach(function(walletValue, idx) {
        if (Number.isNaN(walletValue) === false) {
          if (allWalletValues[idx] > 0) {
            allWalletValues[idx] += walletValue
          } else {
            allWalletValues[idx] = walletValue
          }
        }
      })
    }
    return allWalletValues
  }
}
