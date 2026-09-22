import { AirGapMarketWallet, AirGapWalletPriceService, SubProtocolSymbols, ICoinProtocol, TimeInterval } from '@airgap/coinlib-core'
import axios from '@airgap/coinlib-core/dependencies/src/axios-0.33.0/index'
import { Injectable } from '@angular/core'
import BigNumber from '@airgap/coinlib-core/dependencies/src/bignumber.js-9.0.0/bignumber'
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
  private readonly pendingMarketPriceRequests: Map<string, Promise<BigNumber>> = new Map()
  private readonly marketPriceCache: Map<string, { price: BigNumber; timestamp: number }> = new Map()
  private marketPriceBatch: { symbols: Set<string>; promise: Promise<Map<string, number>> } | undefined = undefined
  private readonly MARKET_PRICE_CACHE_DURATION = 5 * 60 * 1000 // 5 minutes
  private readonly MARKET_PRICE_BATCH_WINDOW_MS = 50
  private readonly MARKET_PRICE_BATCH_SIZE = 50
  private readonly MARKET_PRICE_REQUEST_TIMEOUT_MS = 15 * 1000
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

    const symbol = protocol.marketSymbol.toUpperCase()
    const currency = this.currencyService.getCurrency()
    const cacheKey = `${symbol}_${currency}`

    const cached = this.marketPriceCache.get(cacheKey)
    if (cached !== undefined && Date.now() - cached.timestamp < this.MARKET_PRICE_CACHE_DURATION) {
      return cached.price
    }

    const pendingRequest = this.pendingMarketPriceRequests.get(cacheKey)
    if (pendingRequest !== undefined) {
      return pendingRequest
    }

    const promise: Promise<BigNumber> = this.resolveMarketPrice(protocol, symbol)
      .then((price: BigNumber | undefined) => {
        if (price !== undefined && !price.isNaN()) {
          this.marketPriceCache.set(cacheKey, { price, timestamp: Date.now() })
          return price
        }
        // Request failed: fall back to the last known price if we have one, otherwise
        // signal "unknown" with NaN. Never leave the caller hanging.
        return cached !== undefined ? cached.price : new BigNumber(NaN)
      })
      .finally(() => {
        this.pendingMarketPriceRequests.delete(cacheKey)
      })

    this.pendingMarketPriceRequests.set(cacheKey, promise)

    return promise
  }

  private async resolveMarketPrice(protocol: ICoinProtocol, symbol: string): Promise<BigNumber | undefined> {
    const usdPrice: number | undefined = await this.fetchLatestUsdPrice(symbol)
    if (usdPrice !== undefined && usdPrice > 0) {
      return this.convertToSelectedCurrency(new BigNumber(usdPrice))
    }

    return this.fetchFromCoinGecko(protocol)
  }

  /**
   * Coalesces all price lookups that arrive within a short window into a single
   * request, so N wallets sharing M symbols cost one round trip instead of N.
   */
  private fetchLatestUsdPrice(symbol: string): Promise<number | undefined> {
    if (this.marketPriceBatch === undefined) {
      const symbols: Set<string> = new Set()
      const batch = {
        symbols,
        promise: new Promise<void>((resolve) => setTimeout(resolve, this.MARKET_PRICE_BATCH_WINDOW_MS)).then(() => {
          if (this.marketPriceBatch === batch) {
            this.marketPriceBatch = undefined
          }
          return this.requestLatestUsdPrices(Array.from(symbols))
        })
      }
      this.marketPriceBatch = batch
    }

    this.marketPriceBatch.symbols.add(symbol)

    return this.marketPriceBatch.promise.then((prices: Map<string, number>) => prices.get(symbol))
  }

  private async requestLatestUsdPrices(symbols: string[]): Promise<Map<string, number>> {
    const prices: Map<string, number> = new Map()
    const chunks: string[][] = []
    for (let i = 0; i < symbols.length; i += this.MARKET_PRICE_BATCH_SIZE) {
      chunks.push(symbols.slice(i, i + this.MARKET_PRICE_BATCH_SIZE))
    }

    await Promise.all(
      chunks.map(async (chunk: string[]) => {
        try {
          const response = await axios.get<CryptoPrices[]>(
            `${this.baseURL}/api/v3/prices/latest-usd?baseCurrencySymbols=${chunk.join(',')}`,
            { timeout: this.MARKET_PRICE_REQUEST_TIMEOUT_MS }
          )
          if (response && Array.isArray(response.data)) {
            for (const entry of response.data) {
              if (entry && typeof entry.baseCurrencySymbol === 'string' && typeof entry.price === 'number') {
                prices.set(entry.baseCurrencySymbol.toUpperCase(), entry.price)
              }
            }
          }
        } catch {
          // Missing symbols fall through to the CoinGecko fallback per symbol.
        }
      })
    )

    return prices
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

  public async fetchFromCoinGecko(protocol: ICoinProtocol): Promise<BigNumber | undefined> {
    return new Promise(async (resolve) => {
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
            `https://api.coingecko.com/api/v3/simple/price?ids=${id}&vs_currencies=${currency}`,
            { timeout: this.MARKET_PRICE_REQUEST_TIMEOUT_MS }
          )
          const price = response.data !== undefined && response.data[id] ? new BigNumber(response.data[id][currency]) : new BigNumber(0)
          resolve(price)
        } catch (error) {
          // Rate limited or blocked: report "unknown" instead of rejecting so callers never hang.
          resolve(undefined)
        }
      } else {
        resolve(new BigNumber(0))
      }
    })
  }
}
