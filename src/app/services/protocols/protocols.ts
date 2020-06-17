import { Injectable } from '@angular/core'
import {
  addSubProtocol,
  addSupportedProtocol,
  AeternityProtocol,
  BitcoinProtocol,
  CosmosProtocol,
  EthereumProtocol,
  GenericERC20,
  GenericERC20Configuration,
  getProtocolByIdentifier,
  GroestlcoinProtocol,
  TezosKtProtocol,
  TezosProtocol
} from 'airgap-coin-lib'
import { TezosBTC } from 'airgap-coin-lib/dist/protocols/tezos/fa/TezosBTC'
import { NetworkType } from 'airgap-coin-lib/dist/utils/Network'

import { tokens } from './tokens'

interface SubAccount {
  protocol: string
  subProtocols: GenericERC20Configuration[]
}

export const defaultChainNetwork = { type: NetworkType.MAINNET, name: 'Mainnet', rpcUrl: 'https://rpc.localhost.com/' }

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
    addSupportedProtocol(new AeternityProtocol())
    addSupportedProtocol(new BitcoinProtocol())
    addSupportedProtocol(new EthereumProtocol())
    addSupportedProtocol(new GroestlcoinProtocol())
    addSupportedProtocol(new TezosProtocol())
    addSupportedProtocol(new CosmosProtocol())
  }

  public getEnabledSubProtocols() {
    return ['xtz-btc', 'eth-erc20-xchf']
  }

  public addProtocols() {
    addSubProtocol(new TezosProtocol(), new TezosKtProtocol())
    addSubProtocol(new TezosProtocol(), new TezosBTC())
    this.subProtocols.forEach(supportedSubAccount => {
      supportedSubAccount.subProtocols.forEach(subProtocol => {
        const protocol = getProtocolByIdentifier(supportedSubAccount.protocol, defaultChainNetwork)
        addSubProtocol(
          protocol,
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
        new EthereumProtocol(),
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
