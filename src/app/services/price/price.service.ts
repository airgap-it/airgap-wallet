import { SubProtocolSymbols } from 'airgap-coin-lib/dist/utils/ProtocolSymbols'
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
    if (protocol.marketSymbol.length === 0) {
      return new BigNumber(0)
    }
    // TODO change when market data is available for USDtz
    if (protocol.identifier === SubProtocolSymbols.XTZ_USD) {
      return new BigNumber(1)
    }

    const pendingRequest: Promise<BigNumber> = this.pendingMarketPriceRequests[protocol.marketSymbol]
    if (pendingRequest) {
      return pendingRequest
    }

    const promise: Promise<BigNumber> = new Promise(resolve => {
      cryptocompare
        .price(protocol.marketSymbol.toUpperCase(), baseSymbol)
        .then(async prices => {
          if (prices.USD) {
            resolve(new BigNumber(prices.USD))
          } else {
            const price = await this.fetchFromCoinGecko(protocol)
            resolve(price)
          }
        })
        .catch(async () => {
          const price = await this.fetchFromCoinGecko(protocol)
          resolve(price)
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

  public async fetchFromCoinGecko(protocol: ICoinProtocol): Promise<BigNumber> {
    return new Promise((resolve, reject) => {
      // TODO: Remove once cryptocompare supports xchf
      const symbolMapping = {
        zrx: '0x',
        elf: 'aelf',
        aion: 'aion',
        akro: 'akropolis',
        ampl: 'ampleforth',
        ankr: 'ankr',
        ant: 'aragon',
        aoa: 'aurora',
        brc: 'baer-chain',
        bal: 'balancer',
        bnt: 'bancor',
        band: 'band-protocol',
        bat: 'basic-attention-token',
        bnb: 'binancecoin',
        busd: 'binance-usd',
        btm: 'bytom',
        bzrx: 'bzx-protocol',
        cel: 'celsius-degree-token',
        cennz: 'centrality',
        link: 'chainlink',
        chz: 'chiliz',
        czrx: 'compound-0x',
        comp: 'compound-coin',
        cusdc: 'compound-usd-coin',
        cvt: 'cybervein',
        cro: 'crypto-com-chain',
        crv: 'curve-dao-token',
        dai: 'dai',
        mana: 'decentraland',
        dgtx: 'digitex-futures-exchange',
        dx: 'dxchain',
        eng: 'enigma',
        enj: 'enjincoin',
        lend: 'ethlend',
        ftm: 'fantom',
        fet: 'firstenergy-token',
        gnt: 'golem',
        one: 'one',
        snx: 'havven',
        hedg: 'hedgetrade',
        hot: 'hydro-protocol',
        ht: 'huobi-token',
        husd: 'husd',
        rlc: 'iexec-rlc',
        xin: 'mixin',
        ino: 'ino-coin',
        inb: 'insight-chain',
        ins: 'insolar-old',
        iost: 'iostoken',
        iotx: 'iotex',
        pnk: 'kleros',
        kcs: 'kucoin-shares',
        knc: 'kyber-network',
        leo: 'leo-token',
        lpt: 'livepeer',
        lrc: 'loopring',
        mkr: 'maker',
        matic: 'matic-network',
        mln: 'melon',
        mco: 'monaco',
        mxc: 'mxc',
        nec: 'nectar-token',
        nexo: 'nexo',
        nmr: 'numeraire',
        nxm: 'nxm',
        wnxm: 'wrapped-nxm',
        ocean: 'ocean-protocol',
        okb: 'okb',
        omg: 'omisego',
        ogn: 'origin-protocol',
        trac: 'origintrail',
        pax: 'payperex',
        qnt: 'quant-network',
        ren: 'republic-protocol',
        rsr: 'reserve-rights-token',
        sai: 'sai',
        srm: 'serum',
        agi: 'singularitynet',
        storj: 'storj',
        sxp: 'swipe',
        chsb: 'swissborg',
        trb: 'tellor',
        usdt: 'tether',
        theta: 'theta-token',
        tusd: 'true-usd',
        uma: 'uma',
        ubt: 'unibright',
        usdc: 'usd-coin',
        utk: 'utrust',
        wbtc: 'wrapped-bitcoin',
        stake: 'xdai-stake',
        yfi: 'yearn-finance',
        zb: 'zb-token',
        zil: 'zilliqa',
        xchf: 'cryptofranc'
      }

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
  }
  public async getMarketPricesOverTime(
    protocol: ICoinProtocol,
    timeUnit: TimeUnit,
    _numberOfMinutes: number,
    _date: Date,
    baseSymbol: string
  ): Promise<MarketDataSample[]> {
    if (protocol.marketSymbol.length === 0) {
      return []
    }

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

            resolve(filteredPrices)
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
