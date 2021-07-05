import { AirGapMarketWallet } from '@airgap/coinlib-core'

export interface AccountSync {
  wallet: AirGapMarketWallet
  groupId?: string
  groupLabel?: string
}
