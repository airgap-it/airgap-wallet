import { HttpClient } from '@angular/common/http'
import { Injectable } from '@angular/core'

interface SubAccount {
  symbol: string
  name: string
  marketSymbol: string

  identifier: string
  data: [string]
}

@Injectable()
export class SupportedTokenProvidersProvider {
  supportedTokens: SubAccount[] = [
    {
      symbol: 'AE-ERC20',
      name: 'æternity Ethereum Token',
      marketSymbol: 'ae',
      identifier: 'eth-erc20-ae',
      data: ['0x5ca9a71b1d01849c0a95490cc00559717fcf0d1d']
    }
  ]

  constructor(public http: HttpClient) {
    console.log('Hello SupportedTokenProvidersProvider Provider')
  }
}
