import { HttpClient } from '@angular/common/http'
import { Injectable } from '@angular/core'
import { ICoinProtocol } from 'airgap-coin-lib'
import { AirGapWalletPriceService, MarketDataSample, TimeUnit } from 'airgap-coin-lib/dist/wallet/AirGapMarketWallet'
import BigNumber from 'bignumber.js'
import * as cryptocompare from 'cryptocompare'

@Injectable({
  providedIn: 'root'
})
export class PriceService implements AirGapWalletPriceService {
  private readonly pendingMarketPriceRequests: { [key: string]: Promise<BigNumber> } = {}
  private readonly pendingMarketPriceOverTimeRequests: { [key: string]: Promise<MarketDataSample[]> } = {}
  constructor(private readonly http: HttpClient) {}

  public async getCurrentMarketPrice(protocol: ICoinProtocol, baseSymbol: string): Promise<BigNumber> {
    const pendingRequest: Promise<BigNumber> = this.pendingMarketPriceRequests[protocol.marketSymbol]
    if (pendingRequest) {
      return pendingRequest
    }

    const promise: Promise<BigNumber> = new Promise((resolve, reject) => {
      cryptocompare
        .price(protocol.marketSymbol.toUpperCase(), baseSymbol)
        .then(prices => {
          resolve(new BigNumber(prices.USD))
        })
        .catch(cryptocompareError => {
          // TODO: Remove once cryptocompare supports xchf
          const symbolMapping = {
            xchf: 'cryptofranc'
          }

          console.error('cryptocompare', cryptocompareError)

          const id = symbolMapping[protocol.marketSymbol.toLowerCase()]
          if (id) {
            this.http
              .get<{ data: { usd: string }[] }>(`https://api.coingecko.com/api/v3/simple/price?ids=${id}&vs_currencies=usd`)
              .toPromise()
              .then(({ data }: { data: { usd: string }[] }) => {
                resolve(new BigNumber(data[id].usd))
              })
              .catch(coinGeckoError => {
                console.error(coinGeckoError)
                reject(coinGeckoError)
              })
          }
        })
    })

    this.pendingMarketPriceRequests[protocol.marketSymbol] = promise

    promise
      .then(() => {
        this.pendingMarketPriceRequests[protocol.marketSymbol] = undefined
      })
      .catch()

    return promise
  }
  public async getMarketPricesOverTime(
    protocol: ICoinProtocol,
    timeUnit: TimeUnit,
    _numberOfMinutes: number,
    _date: Date,
    baseSymbol: string
  ): Promise<MarketDataSample[]> {
    const marketSymbol = protocol.marketSymbol
    console.log('cache', 'fetchMarketData', timeUnit, marketSymbol)
    // const uniqueId = `${timeUnit}_${marketSymbol}_${CachingServiceKey.PRICESAMPLES}`

    const pendingRequest = this.pendingMarketPriceOverTimeRequests[marketSymbol]
    if (pendingRequest) {
      console.log('RETURNING PENDING PROMISE OVER TIME')

      return pendingRequest
    }

    const promise: Promise<MarketDataSample[]> = new Promise<MarketDataSample[]>(async resolve => {
      const cachedData = undefined // : StorageObject = await this.storage.get(uniqueId)
      if (cachedData && cachedData.timestamp > Date.now() - 30 * 60 * 1000) {
        resolve(cachedData.value)
      } else {
        let promise: Promise<MarketDataSample[]>
        if (timeUnit === TimeUnit.Days) {
          promise = cryptocompare.histoDay(marketSymbol.toUpperCase(), baseSymbol, {
            limit: 365 - 1
          })
        } else if (timeUnit === TimeUnit.Hours) {
          promise = cryptocompare.histoHour(marketSymbol.toUpperCase(), baseSymbol, {
            limit: 7 * 24 - 1
          })
        } else if (timeUnit === TimeUnit.Minutes) {
          promise = cryptocompare.histoMinute(marketSymbol.toUpperCase(), baseSymbol, {
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
              }
            })

            resolve(marketSample)
          })
          .catch(console.error)
      }
    })

    this.pendingMarketPriceOverTimeRequests[protocol.marketSymbol] = promise

    promise
      .then(() => {
        this.pendingMarketPriceOverTimeRequests[protocol.marketSymbol] = undefined
      })
      .catch()

    return promise
  }
}
