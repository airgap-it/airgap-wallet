import { Injectable } from '@angular/core'
import { Storage } from '@ionic/storage'
import { AirGapMarketWallet, IAirGapTransaction } from 'airgap-coin-lib'
import { MarketDataSample } from 'airgap-coin-lib/dist/wallet/AirGapMarketWallet'
import BigNumber from 'bignumber.js'
import * as cryptocompare from 'cryptocompare'

export enum CachingServiceKey {
  PRICESAMPLES = 'pricesamples',
  TRANSACTIONS = 'transactions',
  VALIDATORS = 'validators',
  DELEGATIONS = 'delegations'
}

export interface TransactionIdentifier {
  publicKey: string
  key: CachingServiceKey
}

export interface PriceSampleIdentifier {
  timeUnit: string
  protocolIdentifier: string
  key: CachingServiceKey
}

export interface StorageObject {
  value: any
  timestamp: number
}

@Injectable({
  providedIn: 'root'
})
export class CachingService {
  private readonly data = []

  constructor(private readonly storage: Storage) {}

  public async setTransactionData(identifier: TransactionIdentifier, value: any): Promise<any> {
    const uniqueId = `${identifier.publicKey}_${identifier.key}`
    return this.storage.set(uniqueId, { value, timestamp: Date.now() })
  }

  public setPriceData(identifier: PriceSampleIdentifier, value: any): Promise<any> {
    const uniqueId = `${identifier.timeUnit}_${identifier.protocolIdentifier}_${identifier.key}`
    return this.storage.set(uniqueId, { value, timestamp: Date.now() })
  }

  public async fetchTransactions(wallet: AirGapMarketWallet): Promise<IAirGapTransaction[]> {
    const uniqueId = `${wallet.publicKey}_${CachingServiceKey.TRANSACTIONS}`

    return new Promise<IAirGapTransaction[]>(async resolve => {
      const rawTransactions: StorageObject = await this.storage.get(uniqueId)
      if (rawTransactions && rawTransactions.timestamp > Date.now() - 30 * 60 * 1000) {
        rawTransactions.value.map(transaction => {
          transaction.amount = new BigNumber(parseInt(transaction.amount, 10))
          transaction.fee = new BigNumber(parseInt(transaction.fee, 10))
        })
        resolve(rawTransactions.value)
      } else {
        resolve(wallet.fetchTransactions(50, 0))
      }
    })
  }

  public fetchMarketData(timeUnit: any, coinProtocol: string): Promise<MarketDataSample[]> {
    const uniqueId = `${timeUnit}_${coinProtocol}_${CachingServiceKey.PRICESAMPLES}`
    const baseSymbol = 'USD'

    return new Promise<MarketDataSample[]>(async resolve => {
      const cachedData: StorageObject = await this.storage.get(uniqueId)
      if (cachedData && cachedData.timestamp > Date.now() - 30 * 60 * 1000) {
        resolve(cachedData.value)
      } else {
        let promise: Promise<MarketDataSample[]>
        if (timeUnit === 'days') {
          promise = cryptocompare.histoDay(coinProtocol.toUpperCase(), baseSymbol, {
            limit: 365 - 1
          })
        } else if (timeUnit === 'hours') {
          promise = cryptocompare.histoHour(coinProtocol.toUpperCase(), baseSymbol, {
            limit: 7 * 24 - 1
          })
        } else if (timeUnit === 'minutes') {
          promise = cryptocompare.histoMinute(coinProtocol.toUpperCase(), baseSymbol, {
            limit: 24 * 60 - 1
          })
        } else {
          promise = Promise.reject('Invalid time unit')
        }
        promise
          .then((prices: MarketDataSample[]) => {
            let filteredPrices: MarketDataSample[] = prices
            if (timeUnit === 'days') {
              filteredPrices = prices.filter((_value, index) => {
                return index % 5 === 0
              })
            }
            if (timeUnit === 'hours') {
              filteredPrices = prices.filter((_value, index) => {
                return index % 2 === 0
              })
            }
            if (timeUnit === 'minutes') {
              filteredPrices = prices.filter((_value, index) => {
                return index % 20 === 0
              })
            }
            const marketSample: MarketDataSample[] = filteredPrices.map((price: MarketDataSample) => {
              return {
                time: price.time,
                close: price.close,
                high: price.high,
                low: price.low,
                volumefrom: price.volumefrom,
                volumeto: price.volumeto
              } as MarketDataSample
            })

            resolve(marketSample)
          })
          .catch(console.error)
      }
    })
  }

  public getData(publicKey): unknown | undefined {
    if (this.data[publicKey]) {
      return this.data[publicKey]
    }
    return undefined
  }
}
