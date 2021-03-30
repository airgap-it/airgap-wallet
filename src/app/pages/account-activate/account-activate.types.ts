import { AirGapMarketWallet, ProtocolSymbols } from '@airgap/coinlib-core'

export interface ProtocolDetails {
  name: string
  identifier: ProtocolSymbols
}
export interface InactiveAccounts {
  id: string
  label: string
  wallets: AirGapMarketWallet[]
}
