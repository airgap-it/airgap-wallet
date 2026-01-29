import { AirGapMarketWallet, AirGapWalletPriceService, SubProtocolSymbols, ICoinProtocol, TimeInterval } from '@airgap/coinlib-core'
import axios from 'axios'
import { Injectable } from '@angular/core'
import BigNumber from 'bignumber.js'
import { IAirGapTransactionResult } from '@airgap/coinlib-core/interfaces/IAirGapTransaction'
import { CachingService, CachingServiceKey, StorageObject } from '../caching/caching.service'
import { CurrencyService } from '../currency/currency.service'
import { FiatCurrencyType } from '../storage/storage'

export interface CryptoPrices {
  time: number
  price: number
  baseCurrencySymbol: string
}

export interface ExchangeRates {
  usd: number
  eur: number
  gbp: number
  chf: number
}

@Injectable({
  providedIn: 'root'
})
export class PriceService implements AirGapWalletPriceService {
  private readonly baseURL: string = 'https://crypto-prices-api.prod.gke.papers.tech'
  private readonly pendingMarketPriceRequests: { [key: string]: Promise<BigNumber> } = {}
  private exchangeRates: ExchangeRates | null = null
  private exchangeRatesTimestamp: number = 0
  private readonly EXCHANGE_RATES_CACHE_DURATION = 30 * 60 * 1000 // 30 minutes

  public constructor(private readonly cachingService: CachingService, private readonly currencyService: CurrencyService) {}

  private async fetchExchangeRates(): Promise<ExchangeRates> {
    if (this.exchangeRates && Date.now() - this.exchangeRatesTimestamp < this.EXCHANGE_RATES_CACHE_DURATION) {
      return this.exchangeRates
    }

    try {
      // Fetch exchange rates relative to USD from a free API
      const response = await axios.get<{ rates: { EUR: number; GBP: number; CHF: number } }>(
        'https://api.exchangerate-api.com/v4/latest/USD'
      )
      this.exchangeRates = {
        usd: 1,
        eur: response.data.rates.EUR,
        gbp: response.data.rates.GBP,
        chf: response.data.rates.CHF
      }
      this.exchangeRatesTimestamp = Date.now()
      return this.exchangeRates
    } catch (error) {
      // Fallback exchange rates if API fails
      return {
        usd: 1,
        eur: 0.92,
        gbp: 0.79,
        chf: 0.88
      }
    }
  }

  public async convertToSelectedCurrency(usdPrice: BigNumber): Promise<BigNumber> {
    const currency = this.currencyService.getCurrency()
    if (currency === FiatCurrencyType.USD) {
      return usdPrice
    }
    const rates = await this.fetchExchangeRates()
    return usdPrice.multipliedBy(rates[currency])
  }

  public async fetchPriceData(marketSymbols: string[], timeInterval: TimeInterval): Promise<CryptoPrices[]> {
    const cachedPriceData: StorageObject = await this.cachingService.getPriceData(marketSymbols, timeInterval)
    if (
      cachedPriceData &&
      cachedPriceData.value &&
      cachedPriceData.timestamp > Date.now() - 30 * 60 * 1000 &&
      Array.isArray(cachedPriceData.value) &&
      cachedPriceData.value.length > 0
    ) {
      return cachedPriceData.value
    } else {
      const cryptoPricesResponse = await axios.get(
        `${this.baseURL}/api/v3/prices/history-usd?baseCurrencySymbols=${marketSymbols
          .map((symbol) => symbol.toUpperCase())
          .join()}&timeInterval=${timeInterval}`
      )
      await this.cachingService.cachePriceData(marketSymbols, cryptoPricesResponse.data, timeInterval)
      return cryptoPricesResponse.data
    }
  }

  public async getCurrentMarketPrice(protocol: ICoinProtocol, _baseSymbol: string): Promise<BigNumber> {
    if (!protocol || protocol.marketSymbol.length === 0) {
      return new BigNumber(0)
    }
    // TODO change when market data is available for USDtz
    if (protocol.identifier === SubProtocolSymbols.XTZ_USD) {
      const usdPrice = new BigNumber(1)
      return this.convertToSelectedCurrency(usdPrice)
    }

    const currency = this.currencyService.getCurrency()
    const cacheKey = `${protocol.marketSymbol}_${currency}`
    const pendingRequest: Promise<BigNumber> = this.pendingMarketPriceRequests[cacheKey]
    if (pendingRequest) {
      return pendingRequest
    }

    const promise: Promise<BigNumber> = new Promise((resolve) => {
      axios
        .get(`${this.baseURL}/api/v3/prices/latest-usd?baseCurrencySymbols=${protocol.marketSymbol.toUpperCase()}`)
        .then(async (response) => {
          if (response && response.data && Array.isArray(response.data) && response.data.length > 0) {
            const cryptoPrices: CryptoPrices = response.data[0]
            if (cryptoPrices.price && cryptoPrices.price > 0) {
              const usdPrice = new BigNumber(cryptoPrices.price)
              const convertedPrice = await this.convertToSelectedCurrency(usdPrice)
              resolve(convertedPrice)
            } else {
              const price = await this.fetchFromCoinGecko(protocol)
              resolve(price)
            }
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

    this.pendingMarketPriceRequests[cacheKey] = promise

    promise
      .then(() => {
        this.pendingMarketPriceRequests[cacheKey] = undefined
      })
      .catch()

    return promise
  }

  public async fetchTransactions(wallet: AirGapMarketWallet): Promise<IAirGapTransactionResult> {
    return new Promise<IAirGapTransactionResult>(async (resolve) => {
      const rawTransactions: StorageObject = await this.cachingService.getWalletData(wallet, CachingServiceKey.TRANSACTIONS)
      if (rawTransactions && rawTransactions.timestamp > Date.now() - 30 * 60 * 1000 && rawTransactions.value.transactions) {
        resolve(rawTransactions.value)
      } else {
        try {
          const rawTransactions = await wallet.fetchTransactions(100)
          await this.cachingService.cacheWalletData(wallet, rawTransactions, CachingServiceKey.TRANSACTIONS)
          resolve(rawTransactions)
        } catch (error) {
          resolve({ transactions: [], cursor: { page: 0 } })
        }
      }
    })
  }

  public async fetchBalance(wallet: AirGapMarketWallet): Promise<BigNumber> {
    return new Promise<BigNumber>(async (resolve) => {
      const rawBalance: StorageObject = await this.cachingService.getWalletData(wallet, CachingServiceKey.BALANCE)
      if (rawBalance && rawBalance.timestamp > Date.now() - 30 * 60 * 1000 && rawBalance.value) {
        resolve(new BigNumber(rawBalance.value))
      } else {
        const balance: BigNumber = await wallet.balanceOf()
        await this.cachingService.cacheWalletData(wallet, balance, CachingServiceKey.BALANCE)
        resolve(balance)
      }
    })
  }

  public async fetchFromCoinGecko(protocol: ICoinProtocol): Promise<BigNumber> {
    return new Promise(async (resolve, reject) => {
      const symbolMapping = {
        acu: 'acurast',
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
        repv2: 'augur',
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
        xchf: 'cryptofranc',
        xtz: 'tezos',
        xlm: 'stellar',
        paxg: 'pax-gold',
        sdn: 'shiden'
      }

      const id = symbolMapping[protocol.marketSymbol.toLowerCase()]
      if (id) {
        try {
          const currency = this.currencyService.getCurrency()

          const response = await axios.get<{ [key: string]: { [currency: string]: number } }>(
            `https://api.coingecko.com/api/v3/simple/price?ids=${id}&vs_currencies=${currency}`
          )
          const price = response.data !== undefined && response.data[id] ? new BigNumber(response.data[id][currency]) : new BigNumber(0)
          resolve(price)
        } catch (error) {
          reject(error)
        }
      } else {
        resolve(new BigNumber(0))
      }
    })
  }
}
