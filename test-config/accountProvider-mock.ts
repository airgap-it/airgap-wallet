import { AirGapMarketWallet } from '@airgap/coinlib-core'

export class AccountProviderMock {
  public constructor(private readonly mockWallet: AirGapMarketWallet) {}

  public walletByPublicKeyAndProtocolAndAddressIndex(
    _publicKey?: string,
    _protocolIdentifier?: string,
    _addressIndex?: number
  ): AirGapMarketWallet {
    return this.mockWallet
  }

  public getWalletList(): AirGapMarketWallet[] {
    return [this.mockWallet]
  }
}
