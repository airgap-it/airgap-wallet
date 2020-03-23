import { Injectable } from '@angular/core'
import { AirGapMarketWallet } from 'airgap-coin-lib'
import { ProtocolSymbols } from '../protocols/protocols'

@Injectable({
  providedIn: 'root'
})
export class ExtensionsService {
  public async loadDelegationExtensions(wallet: AirGapMarketWallet): Promise<void> {
    switch (wallet.protocolIdentifier) {
      case ProtocolSymbols.POLKADOT:
        const { PolkadotDelegationExtensions } = await import('../../extensions/delegation/polkadot/PolkadotDelegationExtensions')
        PolkadotDelegationExtensions.load()
        break
    }
  }
}
