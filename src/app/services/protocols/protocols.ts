import { Injectable } from '@angular/core'
import { addSubProtocol, GenericERC20, GenericERC20Configuration, TezosKtProtocol } from 'airgap-coin-lib'
import { TezosBTC } from 'airgap-coin-lib/dist/protocols/tezos/fa/TezosBTC'

import { tokens } from './tokens'

interface SubAccount {
  protocol: string
  subProtocols: GenericERC20Configuration[]
}

export enum ProtocolSymbols {
  AE = 'ae',
  BTC = 'btc',
  ETH = 'eth',
  XTZ = 'xtz',
  XTZ_KT = 'xtz-kt',
  COSMOS = 'cosmos',
  POLKADOT = 'polkadot',
  KUSAMA = 'kusama',
  TZBTC = 'xtz-btc'
}

@Injectable({
  providedIn: 'root'
})
export class ProtocolsProvider {
  public subProtocols: SubAccount[] = []

  constructor() {
    /* */
  }

  public getEnabledSubProtocols() {
    return ['xtz-btc', 'eth-erc20-xchf']
  }

  public addProtocols() {
    addSubProtocol('xtz', new TezosKtProtocol())
    addSubProtocol('xtz', new TezosBTC())
    this.subProtocols.forEach(supportedSubAccount => {
      supportedSubAccount.subProtocols.forEach(subProtocol => {
        addSubProtocol(
          supportedSubAccount.protocol,
          new GenericERC20({
            symbol: subProtocol.symbol,
            name: subProtocol.name,
            marketSymbol: subProtocol.marketSymbol,
            identifier: subProtocol.identifier,
            contractAddress: subProtocol.contractAddress,
            decimals: subProtocol.decimals
          })
        )
      })
    })
    tokens.forEach(token => {
      addSubProtocol(
        'eth',
        new GenericERC20({
          symbol: token.symbol,
          name: token.name,
          marketSymbol: token.marketSymbol,
          identifier: token.identifier,
          contractAddress: token.contractAddress,
          decimals: token.decimals
        })
      )
    })
  }
}
