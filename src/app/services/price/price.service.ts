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
  private readonly pendingRequests: { [key: string]: Promise<BigNumber> } = {}
  constructor(private readonly http: HttpClient) {}

  public async getCurrentMarketPrice(protocol: ICoinProtocol, baseSymbol: string): Promise<BigNumber> {
    const pendingRequest: Promise<BigNumber> = this.pendingRequests[protocol.marketSymbol]
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
              .get(`https://api.coingecko.com/api/v3/simple/price?ids=${id}&vs_currencies=usd`)
              .toPromise()
              .then(({ data }) => {
                resolve(new BigNumber(data[id].usd))
              })
              .catch(coinGeckoError => {
                console.error(coinGeckoError)
                reject(coinGeckoError)
              })
          }
        })
    })

    this.pendingRequests[protocol.marketSymbol] = promise

    promise
      .then(() => {
        this.pendingRequests[protocol.marketSymbol] = undefined
      })
      .catch()

    return promise
  }
  public async getMarketPricesOverTime(
    _protocol: ICoinProtocol,
    _timeUnit: TimeUnit,
    _numberOfMinutes: number,
    _date: Date,
    _baseSymbol: string
  ): Promise<MarketDataSample[]> {
    throw new Error('Method not implemented.')
  }
}
