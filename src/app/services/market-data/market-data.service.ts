import { AmountConverterPipe, ProtocolService } from '@airgap/angular-core'
import { Injectable } from '@angular/core'
import { AirGapMarketWallet, IAirGapTransaction } from 'airgap-coin-lib'
import { MarketDataSample, TimeUnit } from 'airgap-coin-lib/dist/wallet/AirGapMarketWallet'
import BigNumber from 'bignumber.js'
import * as cryptocompare from 'cryptocompare'

import { AccountProvider } from '../account/account.provider'
import { CachingService, CachingServiceKey } from '../caching/caching.service'
import { IAirGapTransactionResult } from 'airgap-coin-lib/dist/interfaces/IAirGapTransaction'
import { SubProtocolSymbols } from 'airgap-coin-lib'

export interface BalanceAtTimestampObject {
  timestamp: number
  balance: number
}

export interface ValueAtTimestampObject {
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
    private readonly cachingService: CachingService,
    private readonly protocolService: ProtocolService
  ) {}

  public async getTransactionHistory(wallet: AirGapMarketWallet, transactions: IAirGapTransaction[]): Promise<TransactionHistoryObject[]> {
    const txHistory: TransactionHistoryObject[] = []
    // TODO fetch more than 50 txs?
    const protocol = await this.protocolService.getProtocol(wallet.protocol.identifier)
    transactions.forEach(transaction => {
      const amount = new BigNumber(transaction.amount).shiftedBy(-1 * protocol.decimals).toNumber()
      const fee = new BigNumber(transaction.fee).shiftedBy(-1 * protocol.decimals).toNumber() //
      let selfTx: boolean
      if (transaction.to[0] === transaction.from[0]) {
        selfTx = true
      }
      txHistory.push({ timestamp: transaction.timestamp, amount, fee, isInbound: transaction.isInbound, selfTx })
    })

    return txHistory
  }

  public async fetchBalanceAfterEachTransaction(
    wallet: AirGapMarketWallet,
    transactions: IAirGapTransaction[]
  ): Promise<BalanceAtTimestampObject[]> {
    const txHistory: TransactionHistoryObject[] = await this.getTransactionHistory(wallet, transactions)
    const balancesByTimestamp: BalanceAtTimestampObject[] = []

    let currentBalance = parseFloat(this.amountConverterPipe.transformValueOnly(wallet.currentBalance, wallet.protocol, 10))
    // txHistory is sorted from most recent to oldest tx
    txHistory.forEach((transaction: TransactionHistoryObject) => {
      balancesByTimestamp.push({ timestamp: transaction.timestamp, balance: currentBalance })
      if (!transaction.isInbound && transaction.selfTx === undefined) {
        currentBalance += transaction.amount + transaction.fee
      } else if (transaction.selfTx) {
        currentBalance += transaction.fee
      } else {
        currentBalance -= transaction.amount
      }
    })

    return balancesByTimestamp
  }

  public static balanceAtTimestamp(myTimestamp: number, balancesAfterEachTransaction: BalanceAtTimestampObject[]): number | undefined {
    const timestamps = balancesAfterEachTransaction.map(object => object.timestamp).reverse()

    if (myTimestamp < timestamps[0] || balancesAfterEachTransaction.length === 0) {
      return 0
    }

    let closestTimestamp = timestamps[0]
    let diff = Math.abs(myTimestamp - closestTimestamp)
    for (let val = 0; val < timestamps.length; val++) {
      const newdiff = Math.abs(myTimestamp - timestamps[val])
      if (newdiff < diff && timestamps[val] < myTimestamp) {
        // we want the closest timestamp which is smaller than myTimestamp
        diff = newdiff
        closestTimestamp = timestamps[val]
      }
    }

    return balancesAfterEachTransaction.find(object => object.timestamp === closestTimestamp).balance
  }

  public async fetchValuesAtTimestampSingleWallet(
    wallet: AirGapMarketWallet,
    priceSamples: MarketDataSample[],
    transactions: IAirGapTransaction[]
  ): Promise<ValueAtTimestampObject[]> {
    const valuesAtTimestamp: ValueAtTimestampObject[] = []
    const balancesAfterEachTransaction: BalanceAtTimestampObject[] = await this.fetchBalanceAfterEachTransaction(wallet, transactions)
    priceSamples.forEach((priceSample: MarketDataSample) => {
      const realTimeBalance = MarketDataService.balanceAtTimestamp(priceSample.time, balancesAfterEachTransaction)
      const avgDailyPrice = (priceSample.high + priceSample.low) / 2
      valuesAtTimestamp.push({ balance: realTimeBalance * avgDailyPrice, timestamp: priceSample.time })
    })

    return valuesAtTimestamp
  }

  public async fetchAllValues(interval: TimeUnit): Promise<ValueAtTimestampObject[]> {
    return new Promise<ValueAtTimestampObject[]>(async resolve => {
      const wallets = this.walletsProvider.getWalletList().filter(wallet => wallet.protocol.identifier !== SubProtocolSymbols.XTZ_USD)
      // TODO fetchMarketData() only once for each protocolIdentifier
      const cryptoPricePromises = wallets.map(wallet => wallet.getMarketPricesOverTime(interval, 0, new Date()))
      const transactionPromises = wallets.map(wallet => this.cachingService.fetchTransactions(wallet))
      const priceSamples: MarketDataSample[][] = await Promise.all(cryptoPricePromises)

      const transactionResultsByWallet: IAirGapTransactionResult[] = await Promise.all(transactionPromises)
      const allWalletValues = [{ balance: 0, timestamp: 0 }]
      for (const [index, wallet] of wallets.entries()) {
        this.cachingService.setTransactionData(
          { publicKey: wallet.publicKey, key: CachingServiceKey.TRANSACTIONS },
          transactionResultsByWallet[index]
        )
        const walletValues = await this.fetchValuesAtTimestampSingleWallet(
          wallet,
          priceSamples[index],
          transactionResultsByWallet[index].transactions
        )
        walletValues.forEach((walletValue, idx) => {
          if (!Number.isNaN(walletValue.balance)) {
            if (allWalletValues[idx]) {
              if (allWalletValues[idx]['balance'] && allWalletValues[idx]['balance'] > 0) {
                allWalletValues[idx]['balance'] += walletValue.balance
              } else {
                allWalletValues[idx]['balance'] = walletValue.balance
              }
              allWalletValues[idx]['timestamp'] = walletValue.timestamp
            } else {
              allWalletValues[idx] = { timestamp: walletValue.timestamp, balance: walletValue.balance }
            }
          }
        })
      }
      resolve(allWalletValues)
    })
  }

  public fetchCurrentMarketPrice(marketSymbol: string, baseSymbol = 'USD'): Promise<BigNumber | undefined> {
    return new Promise(resolve => {
      if (marketSymbol.length === 0) {
        resolve(undefined)
      }

      cryptocompare.price(marketSymbol.toUpperCase(), baseSymbol).then(prices => {
        const currentMarketPrice = new BigNumber(prices.USD)
        resolve(currentMarketPrice)
      })
    })
  }
}
