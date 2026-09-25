import { AirGapMarketWallet } from '@airgap/coinlib-core'
import { InteractionSetting, SyncSource } from '../models/AirGapMarketWalletGroup'

export interface AccountSync {
  wallet: AirGapMarketWallet
  groupId?: string
  groupLabel?: string
  interactionSetting?: InteractionSetting
  syncSource?: SyncSource
}
