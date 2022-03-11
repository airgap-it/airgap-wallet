import { AirGapMarketWallet, AirGapWalletPriceService, SubProtocolSymbols, TimeInterval } from '@airgap/coinlib-core'
import axios from '../../../../node_modules/axios'
import { Injectable } from '@angular/core'
import { ICoinProtocol } from '@airgap/coinlib-core'
import BigNumber from 'bignumber.js'
import { CachingService, CachingServiceKey, StorageObject } from '../caching/caching.service'
import { IAirGapTransactionResult } from '@airgap/coinlib-core/interfaces/IAirGapTransaction'

export interface CryptoPrices {
  time: number
  price: number
  baseCurrencySymbol: string
}

@Injectable({
  providedIn: 'root'
})
export class PriceService implements AirGapWalletPriceService {
  private readonly baseURL: string = 'https://crypto-prices-api.prod.gke.papers.tech'
  private readonly pendingMarketPriceRequests: { [key: string]: Promise<BigNumber> } = {}

  constructor(private readonly cachingService: CachingService) {}

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
      return new BigNumber(1)
    }

    const pendingRequest: Promise<BigNumber> = this.pendingMarketPriceRequests[protocol.marketSymbol]
    if (pendingRequest) {
      return pendingRequest
    }

    const promise: Promise<BigNumber> = new Promise((resolve) => {
      axios
        .get(`${this.baseURL}/api/v3/prices/latest-usd?baseCurrencySymbols=${protocol.marketSymbol.toUpperCase()}`)
        .then(async (response) => {
          if (response && response.data && Array.isArray(response.data) && response.data.length > 0) {
            const cryptoPrices: CryptoPrices = response.data[0]
            if (cryptoPrices.price) {
              resolve(new BigNumber(cryptoPrices.price))
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

    this.pendingMarketPriceRequests[protocol.marketSymbol] = promise

    promise
      .then(() => {
        this.pendingMarketPriceRequests[protocol.marketSymbol] = undefined
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
        xchf: 'cryptofranc'
      }

      const id = symbolMapping[protocol.marketSymbol.toLowerCase()]
      if (id) {
        try {
          const response = await axios.get<{ data: { usd: string }[] }>(
            `https://api.coingecko.com/api/v3/simple/price?ids=${id}&vs_currencies=usd`
          )
          const price = response.data !== undefined ? new BigNumber(response.data[id].usd) : new BigNumber(0)
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
