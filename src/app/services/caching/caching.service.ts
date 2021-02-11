import { Injectable } from '@angular/core'
import { Storage } from '@ionic/storage'
import { AirGapMarketWallet } from '@airgap/coinlib-core'
import { TimeInterval } from '@airgap/coinlib-core/wallet/AirGapMarketWallet'

export enum CachingServiceKey {
  PRICEDATA = 'pricedata',
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
  constructor(private readonly storage: Storage) {}

  public async cachePriceData(marketSymbols: string[], value: any, timeInterval: TimeInterval): Promise<any> {
    const uniqueId = `${marketSymbols.sort().join()}_${timeInterval}_${CachingServiceKey.PRICEDATA}`
    return this.set(uniqueId, { value, timestamp: Date.now() })
  }

  public async getPriceData(marketSymbols: string[], timeInterval: TimeInterval): Promise<StorageObject> {
    const uniqueId = `${marketSymbols.sort().join()}_${timeInterval}_${CachingServiceKey.PRICEDATA}`
    return this.get(uniqueId)
  }

  public async cacheTransactionData(wallet: AirGapMarketWallet, value: any): Promise<any> {
    const uniqueId = `${wallet.publicKey}_${wallet.protocol.identifier}_${CachingServiceKey.TRANSACTIONS}`
    return this.set(uniqueId, { value, timestamp: Date.now() })
  }

  public async getTransactionData(wallet: AirGapMarketWallet): Promise<StorageObject> {
    const uniqueId = `${wallet.publicKey}_${wallet.protocol.identifier}_${CachingServiceKey.TRANSACTIONS}`
    return this.get(uniqueId)
  }

  public async set(key: string, value: any): Promise<any> {
    return this.storage.set(key, value)
  }

  public async get(key: string): Promise<any> {
    return this.storage.get(key)
  }
}
