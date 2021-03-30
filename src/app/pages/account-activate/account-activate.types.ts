import { AirGapMarketWallet } from '@airgap/coinlib-core'

export interface InactiveAccounts {
  id: string
  label: string
  wallets: AirGapMarketWallet[]
}
