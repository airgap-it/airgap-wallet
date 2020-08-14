import { ExposedPromise } from '@airgap/beacon-sdk/dist/utils/exposed-promise'
import { Injectable } from '@angular/core'
import {
  addSubProtocol,
  addSupportedProtocol,
  AeternityProtocol,
  BitcoinProtocol,
  CosmosProtocol,
  EthereumProtocol,
  GenericERC20,
  getProtocolByIdentifier,
  GroestlcoinProtocol,
  KusamaProtocol,
  PolkadotProtocol,
  supportedProtocols,
  TezosKtProtocol,
  TezosProtocol,
  TezosUSD
} from 'airgap-coin-lib'
import {
  EthereumERC20ProtocolConfig,
  EthereumERC20ProtocolOptions,
  EthereumProtocolNetwork
} from 'airgap-coin-lib/dist/protocols/ethereum/EthereumProtocolOptions'
import { TezosBTC } from 'airgap-coin-lib/dist/protocols/tezos/fa/TezosBTC'
import { TezosBTCProtocolConfig, TezosFAProtocolOptions } from 'airgap-coin-lib/dist/protocols/tezos/fa/TezosFAProtocolOptions'
import { TezosNetwork } from 'airgap-coin-lib/dist/protocols/tezos/TezosProtocol'
import {
  TezblockBlockExplorer,
  TezosProtocolNetwork,
  TezosProtocolNetworkExtras,
  TezosProtocolOptions
} from 'airgap-coin-lib/dist/protocols/tezos/TezosProtocolOptions'
import { NetworkType } from 'airgap-coin-lib/dist/utils/ProtocolNetwork'
import { ProtocolSymbols, SubProtocolSymbols } from 'airgap-coin-lib/dist/utils/ProtocolSymbols'

import { tokens } from './tokens'

interface Token {
  symbol: string
  name: string
  marketSymbol: string
  identifier: string
  contractAddress: string
  decimals: number
}

interface SubAccount {
  protocol: ProtocolSymbols
  subProtocols: Token[]
}

@Injectable({
  providedIn: 'root'
})
export class ProtocolsProvider {
  public _isReady: ExposedPromise<boolean> = new ExposedPromise()
  public isReady: Promise<boolean> = this._isReady.promise
  public subProtocols: SubAccount[] = []

  constructor() {
    try {
      addSupportedProtocol(new AeternityProtocol())
      addSupportedProtocol(new BitcoinProtocol())
      addSupportedProtocol(new EthereumProtocol())
      addSupportedProtocol(new GroestlcoinProtocol())
      addSupportedProtocol(new TezosProtocol())
      addSupportedProtocol(new CosmosProtocol())
      // TODO: enable when we can change the symbol back to "DOT"
      // addSupportedProtocol(new PolkadotProtocol())
      addSupportedProtocol(new KusamaProtocol())

      // for a period of time after the redenomination occurs,
      // it is recommended to use "New DOT" to clearly indicate that we have complied with the change
      // Web3 Foundation will follow up on when to change "New DOT" to "DOT"
      // TODO: remove when we can change the symbol to "DOT"
      const polkadot: PolkadotProtocol = new PolkadotProtocol()
      polkadot.symbol = 'New DOT'
      polkadot.feeSymbol = 'New DOT'
      addSupportedProtocol(polkadot)

      const carthagenetNetwork: TezosProtocolNetwork = new TezosProtocolNetwork(
        'Carthagenet',
        NetworkType.TESTNET,
        'https://tezos-carthagenet-node-1.kubernetes.papers.tech',
        new TezblockBlockExplorer('https://carthagenet.tezblock.io'),
        new TezosProtocolNetworkExtras(
          TezosNetwork.CARTHAGENET,
          'https://tezos-carthagenet-conseil-1.kubernetes.papers.tech',
          TezosNetwork.CARTHAGENET,
          'airgap00391'
        )
      )
      const carthagenetProtocol: TezosProtocol = new TezosProtocol(new TezosProtocolOptions(carthagenetNetwork))

      addSupportedProtocol(carthagenetProtocol)

      addSubProtocol(carthagenetProtocol, new TezosKtProtocol(new TezosProtocolOptions(carthagenetNetwork)))
      addSubProtocol(
        carthagenetProtocol,
        new TezosBTC(
          new TezosFAProtocolOptions(
            carthagenetNetwork,
            new TezosBTCProtocolConfig(undefined, undefined, undefined, undefined, 'KT1TH8YZqLy2GFe7yy2JC7oazRj8nyMtzy4W')
          )
        )
      )

      this.addProtocols()
      this._isReady.resolve(true)
    } catch (e) {}
  }

  public getEnabledSubProtocols() {
    return ['xtz-btc', 'eth-erc20-xchf', 'xtz-usd']
  }

  public async getNetworksForProtocol(protocolIdentifier: string) {
    return supportedProtocols()
      .filter(protocol => protocol.identifier === protocolIdentifier)
      .map(protocol => protocol.options.network)
  }

  public addProtocols() {
    addSubProtocol(new TezosProtocol(), new TezosKtProtocol())
    addSubProtocol(new TezosProtocol(), new TezosBTC())
    addSubProtocol(new TezosProtocol(), new TezosUSD())
    this.subProtocols.forEach(supportedSubAccount => {
      supportedSubAccount.subProtocols.forEach(subProtocol => {
        const protocol = getProtocolByIdentifier(supportedSubAccount.protocol)
        addSubProtocol(
          protocol,
          new GenericERC20(
            new EthereumERC20ProtocolOptions(
              new EthereumProtocolNetwork(),
              new EthereumERC20ProtocolConfig(
                subProtocol.symbol,
                subProtocol.name,
                subProtocol.marketSymbol,
                subProtocol.identifier as SubProtocolSymbols,
                subProtocol.contractAddress,
                subProtocol.decimals
              )
            )
          )
        )
      })
    })
    tokens.forEach(token => {
      addSubProtocol(
        new EthereumProtocol(),
        new GenericERC20(
          new EthereumERC20ProtocolOptions(
            new EthereumProtocolNetwork(),
            new EthereumERC20ProtocolConfig(
              token.symbol,
              token.name,
              token.marketSymbol,
              token.identifier as SubProtocolSymbols,
              token.contractAddress,
              token.decimals
            )
          )
        )
      )
    })
    console.log('ADDED PROTOCOLS')
  }
}
