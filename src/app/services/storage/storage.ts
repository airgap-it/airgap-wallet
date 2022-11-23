import { BaseStorage } from '@airgap/angular-core'
import { Network } from '@airgap/beacon-sdk'
import { ICoinProtocol, SerializedAirGapWallet } from '@airgap/coinlib-core'
import { ProtocolOptions } from '@airgap/coinlib-core/utils/ProtocolOptions'
import { Injectable } from '@angular/core'
import { Storage } from '@ionic/storage'

import { SerializedAirGapMarketWalletGroup } from '../../models/AirGapMarketWalletGroup'
import { ExchangeTransactionDetails } from '../exchange/exchange'

export type BeaconRequest = [string, any, ICoinProtocol]
export type themeOptions = 'light' | 'dark' | 'system'

export interface SerializedBeaconRequest {
  messageId: string
  payload: any
  protocolIdentifier: string
  network: Network
}

export enum WalletStorageKey {
  INTRODUCTION = 'introduction',
  WALLET_INTRODUCTION = 'walletIntroduction',
  CAMERA_PERMISSION_ASKED = 'cameraPermissionAsked',
  DEEP_LINK = 'deepLink',
  PUSH_INTRODUCTION = 'pushIntroduction',
  EXCHANGE_INTEGRATION = 'exchangeIntroduction',
  WALLET = 'wallets',
  WALLET_GROUPS = 'walletGroups',
  LAST_TX_BROADCAST = 'lastTxBroadcast',
  USER_ID = 'user_id',
  PENDING_EXCHANGE_TRANSACTIONS = 'PENDING_EXCHANGE_TRANSACTIONS',
  BEACON_REQUESTS = 'BEACON_REQUESTS',
  PENDING_REQUEST = 'PENDING_REQUEST',
  GENERIC_SUBPROTOCOLS = 'GENERIC_SUBPROTOCOLS',
  CONTRACT_ADDRESSES = 'CONTRACT_ADDRESSES',
  THEME = 'theme'
}

interface IBroadcastTransaction {
  protocol: string
  accountIdentifier: string
  date: number
}

interface WalletStorageKeyReturnType {
  [WalletStorageKey.INTRODUCTION]: boolean
  [WalletStorageKey.WALLET_INTRODUCTION]: boolean
  [WalletStorageKey.CAMERA_PERMISSION_ASKED]: boolean
  [WalletStorageKey.DEEP_LINK]: boolean
  [WalletStorageKey.PUSH_INTRODUCTION]: boolean
  [WalletStorageKey.EXCHANGE_INTEGRATION]: boolean
  [WalletStorageKey.WALLET]: SerializedAirGapWallet[] | undefined
  [WalletStorageKey.WALLET_GROUPS]: SerializedAirGapMarketWalletGroup[] | undefined
  [WalletStorageKey.LAST_TX_BROADCAST]: IBroadcastTransaction | undefined
  [WalletStorageKey.USER_ID]: string | undefined
  [WalletStorageKey.PENDING_EXCHANGE_TRANSACTIONS]: ExchangeTransactionDetails[]
  [WalletStorageKey.BEACON_REQUESTS]: SerializedBeaconRequest[]
  [WalletStorageKey.PENDING_REQUEST]: SerializedBeaconRequest[]
  [WalletStorageKey.GENERIC_SUBPROTOCOLS]: Record<string, ProtocolOptions>
  [WalletStorageKey.CONTRACT_ADDRESSES]: Record<string, { address: string; configuration?: any }>
  [WalletStorageKey.THEME]: themeOptions
}

type WalletStorageKeyReturnDefaults = { [key in WalletStorageKey]: WalletStorageKeyReturnType[key] }

const defaultValues: WalletStorageKeyReturnDefaults = {
  [WalletStorageKey.INTRODUCTION]: false,
  [WalletStorageKey.WALLET_INTRODUCTION]: false,
  [WalletStorageKey.CAMERA_PERMISSION_ASKED]: false,
  [WalletStorageKey.DEEP_LINK]: false,
  [WalletStorageKey.PUSH_INTRODUCTION]: false,
  [WalletStorageKey.EXCHANGE_INTEGRATION]: false,
  [WalletStorageKey.WALLET]: undefined,
  [WalletStorageKey.WALLET_GROUPS]: undefined,
  [WalletStorageKey.LAST_TX_BROADCAST]: undefined,
  [WalletStorageKey.USER_ID]: undefined,
  [WalletStorageKey.PENDING_EXCHANGE_TRANSACTIONS]: [],
  [WalletStorageKey.BEACON_REQUESTS]: [],
  [WalletStorageKey.PENDING_REQUEST]: [],
  [WalletStorageKey.GENERIC_SUBPROTOCOLS]: {},
  [WalletStorageKey.CONTRACT_ADDRESSES]: {},
  [WalletStorageKey.THEME]: undefined
}

@Injectable({
  providedIn: 'root'
})
export class WalletStorageService extends BaseStorage<WalletStorageKey, WalletStorageKeyReturnType> {
  constructor(storage: Storage) {
    super(storage, defaultValues)
  }

  public async getCache<T>(key: string): Promise<T> {
    await this.storage.ready()

    return this.storage.get(`cache-${key}`)
  }

  public async setCache<T>(key: string, value: T): Promise<T> {
    await this.storage.ready()

    return this.storage.set(`cache-${key}`, value)
  }
}
