import { Injectable } from '@angular/core'
import { Storage } from '@ionic/storage'
import { AirGapMarketWallet } from 'airgap-coin-lib'
import { ExchangeTransaction } from '../exchange/exchange'

export enum SettingsKey {
  INTRODUCTION = 'introduction',
  WALLET_INTRODUCTION = 'walletIntroduction',
  CAMERA_PERMISSION_ASKED = 'cameraPermissionAsked',
  DEEP_LINK = 'deepLink',
  WEB_EXTENSION_DISCLAIMER = 'webExtensionDisclaimer',
  PUSH_INTRODUCTION = 'pushIntroduction',
  EXCHANGE_INTEGRATION = 'exchangeIntroduction',
  WALLET = 'wallets',
  SELECTED_ACCOUNT = 'selectedAccount',
  LAST_TX_BROADCAST = 'lastTxBroadcast',
  USER_ID = 'user_id',
  SETTINGS_SERIALIZER_ENABLE_V2 = 'SETTINGS_SERIALIZER_ENABLE_V2',
  SETTINGS_SERIALIZER_CHUNK_TIME = 'SETTINGS_SERIALIZER_CHUNK_TIME',
  SETTINGS_SERIALIZER_CHUNK_SIZE = 'SETTINGS_SERIALIZER_CHUNK_SIZE',
  PENDING_EXCHANGE_TRANSACTIONS = 'PENDING_EXCHANGE_TRANSACTIONS'
}

interface IPartialAirGapWallet {
  protocolIdentifier: string
  publicKey: string
  isExtendedPublicKey: boolean
  derivationPath: string
  addresses: string[]
  addressIndex?: number
}

interface IBroadcastTransaction {
  protocol: string
  accountIdentifier: string
  date: number
}

interface SettingsKeyReturnType {
  [SettingsKey.INTRODUCTION]: boolean
  [SettingsKey.WALLET_INTRODUCTION]: boolean
  [SettingsKey.CAMERA_PERMISSION_ASKED]: boolean
  [SettingsKey.DEEP_LINK]: boolean
  [SettingsKey.WEB_EXTENSION_DISCLAIMER]: boolean
  [SettingsKey.PUSH_INTRODUCTION]: boolean
  [SettingsKey.EXCHANGE_INTEGRATION]: boolean
  [SettingsKey.WALLET]: IPartialAirGapWallet[] | undefined
  [SettingsKey.SELECTED_ACCOUNT]: AirGapMarketWallet | undefined
  [SettingsKey.LAST_TX_BROADCAST]: IBroadcastTransaction | undefined
  [SettingsKey.USER_ID]: string | undefined
  [SettingsKey.SETTINGS_SERIALIZER_ENABLE_V2]: boolean
  [SettingsKey.SETTINGS_SERIALIZER_CHUNK_TIME]: number
  [SettingsKey.SETTINGS_SERIALIZER_CHUNK_SIZE]: number
  [SettingsKey.PENDING_EXCHANGE_TRANSACTIONS]: ExchangeTransaction[]
}

type SettingsKeyReturnDefaults = { [key in SettingsKey]: SettingsKeyReturnType[key] }

const defaultValues: SettingsKeyReturnDefaults = {
  [SettingsKey.INTRODUCTION]: false,
  [SettingsKey.WALLET_INTRODUCTION]: false,
  [SettingsKey.CAMERA_PERMISSION_ASKED]: false,
  [SettingsKey.DEEP_LINK]: false,
  [SettingsKey.WEB_EXTENSION_DISCLAIMER]: false,
  [SettingsKey.PUSH_INTRODUCTION]: false,
  [SettingsKey.EXCHANGE_INTEGRATION]: false,
  [SettingsKey.WALLET]: undefined,
  [SettingsKey.SELECTED_ACCOUNT]: undefined,
  [SettingsKey.LAST_TX_BROADCAST]: undefined,
  [SettingsKey.USER_ID]: undefined,
  [SettingsKey.SETTINGS_SERIALIZER_ENABLE_V2]: false,
  [SettingsKey.SETTINGS_SERIALIZER_CHUNK_TIME]: 500,
  [SettingsKey.SETTINGS_SERIALIZER_CHUNK_SIZE]: 100,
  [SettingsKey.PENDING_EXCHANGE_TRANSACTIONS]: []
}

@Injectable({
  providedIn: 'root'
})
export class StorageProvider {
  constructor(private readonly storage: Storage) {}

  public async get<K extends SettingsKey>(key: K): Promise<SettingsKeyReturnType[K]> {
    const value: SettingsKeyReturnType[K] = (await this.storage.get(key)) || defaultValues[key]
    console.log(`[SETTINGS_SERVICE:get] ${key}, returned: ${value}`)

    return value
  }

  public async set<K extends SettingsKey>(key: K, value: SettingsKeyReturnType[K]): Promise<any> {
    console.log(`[SETTINGS_SERVICE:set] ${key}, ${value}`)

    return this.storage.set(key, value)
  }

  public async delete<K extends SettingsKey>(key: K): Promise<boolean> {
    try {
      await this.storage.remove(key)

      return true
    } catch (error) {
      return false
    }
  }

  public async getCache<T>(key: string): Promise<T> {
    return this.storage.get(key)
  }

  public async setCache<T>(key: string, value: T): Promise<T> {
    return this.storage.set(key, value)
  }
}
