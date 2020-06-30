import { Injectable } from '@angular/core'
import { Storage } from '@ionic/storage'
import { AirGapMarketWallet, IAirGapTransaction } from 'airgap-coin-lib'
import BigNumber from 'bignumber.js'

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
  constructor(private readonly storage: Storage) {}

  public async setTransactionData(identifier: TransactionIdentifier, value: any): Promise<any> {
    console.log('cache', 'setTransactionData', identifier, value)
    const uniqueId = `${identifier.publicKey}_${identifier.key}`
    return this.storage.set(uniqueId, { value, timestamp: Date.now() })
  }

  private async getCacheId(wallet: AirGapMarketWallet, key: CachingServiceKey): Promise<string> {
    console.log('cache', 'getCacheId', key)
    return `${wallet.publicKey}_${wallet.protocol.options.network.identifier}_${key}`
  }

  public async fetchTransactions(wallet: AirGapMarketWallet): Promise<IAirGapTransaction[]> {
    console.log('cache', 'fetchTransactions', wallet)
    const uniqueId = await this.getCacheId(wallet, CachingServiceKey.TRANSACTIONS)

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
}
