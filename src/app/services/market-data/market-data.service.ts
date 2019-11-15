import { AmountConverterPipe } from './../../pipes/amount-converter/amount-converter.pipe'
import { AccountProvider } from './../account/account.provider'
import { Injectable } from '@angular/core'
import { AirGapMarketWallet, IAirGapTransaction, getProtocolByIdentifier } from 'airgap-coin-lib'
import { TimeUnit, MarketDataSample } from 'airgap-coin-lib/dist/wallet/AirGapMarketWallet'
import { CachingService, CachingServiceKey } from '../caching/caching.service'
import BigNumber from 'bignumber.js'

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

@Injectable()
export class MarketDataService {
  constructor(
    public walletsProvider: AccountProvider,
    private readonly amountConverterPipe: AmountConverterPipe,
    private readonly cachingService: CachingService
  ) {}

  async getTransactionHistory(wallet: AirGapMarketWallet, transactions: IAirGapTransaction[]): Promise<Array<TransactionHistoryObject>> {
    let txHistory: Array<TransactionHistoryObject> = []
    // TODO fetch more than 50 txs?
    const protocol = getProtocolByIdentifier(wallet.protocolIdentifier)
    transactions.forEach(transaction => {
      let amount = new BigNumber(transaction.amount).shiftedBy(-1 * protocol.decimals).toNumber()
      const fee = new BigNumber(transaction.fee).shiftedBy(-1 * protocol.decimals).toNumber() //
      let selfTx: boolean
      if (transaction.to[0] === transaction.from[0]) {
        selfTx = true
      }
      txHistory.push({ timestamp: transaction.timestamp, amount: amount, fee: fee, isInbound: transaction.isInbound, selfTx: selfTx })
    })

    return txHistory
  }

  async fetchBalanceAfterEachTransaction(
    wallet: AirGapMarketWallet,
    transactions: IAirGapTransaction[]
  ): Promise<Array<BalanceAtTimestampObject>> {
    let txHistory: Array<TransactionHistoryObject> = await this.getTransactionHistory(wallet, transactions)
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

  async fetchValuesSingleWallet(
    wallet: AirGapMarketWallet,
    priceSamples: MarketDataSample[],
    transactions: IAirGapTransaction[]
  ): Promise<number[]> {
    let walletValues: Array<number> = []
    let balancesAfterEachTransaction: Array<BalanceAtTimestampObject> = await this.fetchBalanceAfterEachTransaction(wallet, transactions)
    priceSamples.forEach((priceSample: MarketDataSample) => {
      const realTimeBalance = MarketDataService.balanceAtTimestamp(priceSample.time, balancesAfterEachTransaction)
      let avgDailyPrice = (priceSample.high + priceSample.low) / 2
      walletValues.push(realTimeBalance * avgDailyPrice)
    })

    return walletValues
  }

  async fetchAllValues(interval: TimeUnit | string): Promise<number[]> {
    return new Promise<number[]>(resolve => {
      this.walletsProvider.wallets.subscribe(async wallets => {
        // TODO fetchMarketData() only once for each protocolIdentifier
        const cryptoPricePromises = wallets.map(wallet => this.cachingService.fetchMarketData(interval, wallet.coinProtocol.marketSymbol))
        const transactionPromises = wallets.map(wallet => this.cachingService.fetchTransactions(wallet))
        const priceSamples: MarketDataSample[][] = await Promise.all(cryptoPricePromises)
        const transactionsByWallet: IAirGapTransaction[][] = await Promise.all(transactionPromises)
        let allWalletValues = [0, 0]
        for (let [index, wallet] of wallets.entries()) {
          this.cachingService.setPriceData(
            { timeUnit: interval, protocolIdentifier: wallet.coinProtocol.marketSymbol, key: CachingServiceKey.PRICESAMPLES },
            priceSamples[index]
          )
          this.cachingService.setTransactionData(
            { publicKey: wallet.publicKey, key: CachingServiceKey.TRANSACTIONS },
            transactionsByWallet[index]
          )
          let walletValues = await this.fetchValuesSingleWallet(wallet, priceSamples[index], transactionsByWallet[index])
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
        resolve(allWalletValues)
      })
    })
  }
}
