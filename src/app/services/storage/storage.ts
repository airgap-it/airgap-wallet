import { BaseStorage } from '@airgap/angular-core'
import { Network } from '@airgap/beacon-sdk'
import { Injectable } from '@angular/core'
import { Storage } from '@ionic/storage'
import { ICoinProtocol } from 'airgap-coin-lib'
import { ProtocolSymbols } from 'airgap-coin-lib/dist/utils/ProtocolSymbols'

import { ExchangeTransaction } from '../exchange/exchange'

export type BeaconRequest = [string, any, ICoinProtocol]
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
  LAST_TX_BROADCAST = 'lastTxBroadcast',
  USER_ID = 'user_id',
  PENDING_EXCHANGE_TRANSACTIONS = 'PENDING_EXCHANGE_TRANSACTIONS',
  BEACON_REQUESTS = 'BEACON_REQUESTS'
}

interface SerializedAirGapWallet {
  protocolIdentifier: ProtocolSymbols
  networkIdentifier: string
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

interface WalletStorageKeyReturnType {
  [WalletStorageKey.INTRODUCTION]: boolean
  [WalletStorageKey.WALLET_INTRODUCTION]: boolean
  [WalletStorageKey.CAMERA_PERMISSION_ASKED]: boolean
  [WalletStorageKey.DEEP_LINK]: boolean
  [WalletStorageKey.PUSH_INTRODUCTION]: boolean
  [WalletStorageKey.EXCHANGE_INTEGRATION]: boolean
  [WalletStorageKey.WALLET]: SerializedAirGapWallet[] | undefined
  [WalletStorageKey.LAST_TX_BROADCAST]: IBroadcastTransaction | undefined
  [WalletStorageKey.USER_ID]: string | undefined
  [WalletStorageKey.PENDING_EXCHANGE_TRANSACTIONS]: ExchangeTransaction[]
  [WalletStorageKey.BEACON_REQUESTS]: SerializedBeaconRequest[]
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
  [WalletStorageKey.LAST_TX_BROADCAST]: undefined,
  [WalletStorageKey.USER_ID]: undefined,
  [WalletStorageKey.PENDING_EXCHANGE_TRANSACTIONS]: [],
  [WalletStorageKey.BEACON_REQUESTS]: []
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
