import { Injectable } from '@angular/core'
import { Storage } from '@ionic/storage'
import { AirGapMarketWallet } from '@airgap/coinlib-core'
import { TimeInterval } from '@airgap/coinlib-core/wallet/AirGapMarketWallet'

export enum CachingServiceKey {
  PRICEDATA = 'pricedata',
  TRANSACTIONS = 'transactions',
  VALIDATORS = 'validators',
  DELEGATIONS = 'delegations',
  BALANCE = 'balance'
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
  constructor(private readonly storage: Storage) {}

  public async cachePriceData(marketSymbols: string[], value: any, timeInterval: TimeInterval): Promise<any> {
    const uniqueId = `${marketSymbols.sort().join()}_${timeInterval}_${CachingServiceKey.PRICEDATA}`
    return this.set(uniqueId, { value, timestamp: Date.now() })
  }

  public async getPriceData(marketSymbols: string[], timeInterval: TimeInterval): Promise<StorageObject> {
    const uniqueId = `${marketSymbols.sort().join()}_${timeInterval}_${CachingServiceKey.PRICEDATA}`
    return this.get(uniqueId)
  }

  public async cacheWalletData(
    wallet: AirGapMarketWallet,
    value: any,
    key: CachingServiceKey.TRANSACTIONS | CachingServiceKey.BALANCE
  ): Promise<any> {
    const uniqueId = `${wallet.publicKey}_${wallet.protocol.identifier}_${key}`
    return this.set(uniqueId, { value, timestamp: Date.now() })
  }

  public async getWalletData(
    wallet: AirGapMarketWallet,
    key: CachingServiceKey.TRANSACTIONS | CachingServiceKey.BALANCE
  ): Promise<StorageObject> {
    const uniqueId = `${wallet.publicKey}_${wallet.protocol.identifier}_${key}`
    return this.get(uniqueId)
  }

  public async set(key: string, value: any): Promise<any> {
    return this.storage.set(key, value)
  }

  public async get(key: string): Promise<any> {
    return this.storage.get(key)
  }
}
