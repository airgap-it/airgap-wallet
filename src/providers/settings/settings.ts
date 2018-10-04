import { Injectable } from '@angular/core'
import { Storage } from '@ionic/storage'

export enum SettingsKey {
  INTRODUCTION = 'introduction',
  WALLET = 'wallets'
}

interface IPartialAirGapWallet {
  protocolIdentifier: string
  publicKey: string
  isExtendedPublicKey: boolean
  derivationPath: string
  addresses: string[]
}

type SettingsKeyReturnType = {
  [SettingsKey.INTRODUCTION]: boolean
  [SettingsKey.WALLET]: IPartialAirGapWallet[]
}

@Injectable()
export class SettingsProvider {
  constructor(private storage: Storage) {}

  public async get<K extends SettingsKey>(key: K): Promise<SettingsKeyReturnType[K]> {
    return this.storage.get(key)
  }

  public async set<K extends SettingsKey>(key: K, value: SettingsKeyReturnType[K]): Promise<any> {
    return this.storage.set(key, value)
  }
}
