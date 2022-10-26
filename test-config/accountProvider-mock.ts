import { AirGapCoinWallet, AirGapMarketWallet, AirGapWalletStatus } from '@airgap/coinlib-core'
import { EthereumProtocol } from '@airgap/ethereum'
import BigNumber from 'bignumber.js'

import { PriceServiceMock } from './wallet-mock'

export class AccountProviderMock {
  private mockWallet: AirGapMarketWallet = Object.assign(
    new AirGapCoinWallet(
      new EthereumProtocol(),
      '03ea568e601e6e949a3e5c60e0f4ee94383e4b083c5ab64b66e70372df008cbbe6',
      false,
      "m/44'/60'/0'/0/0",
      '',
      AirGapWalletStatus.ACTIVE,
      new PriceServiceMock()
    ),
    {
      currentMarketPrice: new BigNumber('100')
    }
  )

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
