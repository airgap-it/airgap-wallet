import { Injectable } from '@angular/core'
import { GenericERC20, addSubProtocol } from 'airgap-coin-lib'

interface SubProtocolInfo {
  symbol: string
  name: string
  marketSymbol: string

  identifier: string
  data: [string]
}

interface SubAccount {
  protocol: string
  subProtocols: SubProtocolInfo[]
}

@Injectable()
export class SupportedSubAccountsProvider {
  public supportedSubAccounts: SubAccount[] = [
    {
      protocol: 'eth',
      subProtocols: [
        {
          symbol: 'AE-ERC20',
          name: 'æternity Ethereum Token',
          marketSymbol: 'ae',
          identifier: 'eth-erc20-ae',
          data: ['0x5ca9a71b1d01849c0a95490cc00559717fcf0d1d']
        },
        {
          symbol: 'GNT-ERC20',
          name: 'Golem Ethereum Token',
          marketSymbol: 'gnt',
          identifier: 'eth-erc20-gnt',
          data: ['0xa74476443119A942dE498590Fe1f2454d7D4aC0d']
        }
      ]
    }
  ]

  constructor() {}

  addSupportedSubAccounts() {
    this.supportedSubAccounts.forEach(supportedSubAccount => {
      supportedSubAccount.subProtocols.forEach(subProtocol => {
        addSubProtocol(
          supportedSubAccount.protocol,
          new GenericERC20(subProtocol.symbol, subProtocol.name, subProtocol.marketSymbol, subProtocol.identifier, subProtocol.data[0])
        )
      })
    })
  }
}
