import { AirGapMarketWallet } from '@airgap/coinlib-core'

export function createAccountId(wallet: AirGapMarketWallet): string
export function createAccountId(protocolIdentifier: string, publicKey: string): string
export function createAccountId(walletOrIdentifier: AirGapMarketWallet | string, publicKey?: string): string {
  const protocolIdentifier: string = typeof walletOrIdentifier === 'string' ? walletOrIdentifier : walletOrIdentifier.protocol.identifier
  const walletPublicKey: string = typeof walletOrIdentifier === 'string' ? publicKey : walletOrIdentifier.publicKey

  return `${protocolIdentifier}:${walletPublicKey}`
}
