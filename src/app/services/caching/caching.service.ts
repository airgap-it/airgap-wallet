import { Injectable } from '@angular/core'
import { Storage } from '@ionic/storage'
import { AirGapMarketWallet } from 'airgap-coin-lib'
import BigNumber from 'bignumber.js'
import { IAirGapTransactionResult } from 'airgap-coin-lib/dist/interfaces/IAirGapTransaction'

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

  public async fetchTransactions(wallet: AirGapMarketWallet): Promise<IAirGapTransactionResult> {
    const uniqueId = `${wallet.publicKey}_${CachingServiceKey.TRANSACTIONS}`
    return new Promise<IAirGapTransactionResult>(async resolve => {
      const rawTransactions: StorageObject = await this.storage.get(uniqueId)
      if (rawTransactions && rawTransactions.timestamp > Date.now() - 30 * 60 * 1000) {
        rawTransactions.value.transactions.map(transaction => {
          transaction.amount = new BigNumber(parseInt(transaction.amount, 10))
          transaction.fee = new BigNumber(parseInt(transaction.fee, 10))
        })
        resolve(rawTransactions.value)
      } else {
        resolve(wallet.fetchTransactions(50))
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
