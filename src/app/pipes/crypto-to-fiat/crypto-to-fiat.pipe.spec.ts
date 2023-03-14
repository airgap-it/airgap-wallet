import { IsolatedModulesPlugin, MainProtocolStoreService, ProtocolService, SubProtocolStoreService, WebIsolatedModules } from '@airgap/angular-core'
import { MainProtocolSymbols } from '@airgap/coinlib-core'
import { BigNumber } from 'bignumber.js'

import { CryptoToFiatPipe } from './crypto-to-fiat.pipe'

describe('CryptoToFiatPipe', () => {
  let cryptoToFiatPipe: CryptoToFiatPipe
  let protocolService: ProtocolService
  let isolatedModules: IsolatedModulesPlugin

  beforeAll(() => {
    isolatedModules = new WebIsolatedModules()
    protocolService = new ProtocolService(
      new MainProtocolStoreService(isolatedModules), 
      new SubProtocolStoreService(isolatedModules), 
      isolatedModules
    )
    protocolService.init()
  })

  beforeEach(() => {
    cryptoToFiatPipe = new CryptoToFiatPipe(protocolService)
  })

  it('should return the right price', async () => {
    expect(
      await cryptoToFiatPipe.transform(new BigNumber(1), {
        protocolIdentifier: MainProtocolSymbols.ETH,
        currentMarketPrice: new BigNumber(200)
      })
    ).toEqual('0.0000000000000002')
  })

  it('should return an empty string when protocolIdentifier is not set', async () => {
    expect(
      await cryptoToFiatPipe.transform(new BigNumber(1), {
        protocolIdentifier: undefined,
        currentMarketPrice: new BigNumber(200)
      })
    ).toEqual('')
  })

  it('should return an empty string when protocolIdentifier is invalid', async () => {
    expect(
      await cryptoToFiatPipe.transform(new BigNumber(1), {
        protocolIdentifier: 'bananarama' as any,
        currentMarketPrice: new BigNumber(200)
      })
    ).toEqual('')
  })

  it('should return an empty string when value is not a BigNumber', async () => {
    const value: any = 'test'
    expect(
      await cryptoToFiatPipe.transform(value, {
        protocolIdentifier: MainProtocolSymbols.ETH,
        currentMarketPrice: new BigNumber(200)
      })
    ).toEqual('')
  })

  it('should return an empty string when price is not a BigNumber', async () => {
    const value: any = 'test'
    expect(
      await cryptoToFiatPipe.transform(new BigNumber(1), {
        protocolIdentifier: MainProtocolSymbols.ETH,
        currentMarketPrice: value
      })
    ).toEqual('')
  })

  it('should return an empty string when value is undefined', async () => {
    expect(
      await cryptoToFiatPipe.transform(undefined, {
        protocolIdentifier: MainProtocolSymbols.ETH,
        currentMarketPrice: new BigNumber(200)
      })
    ).toEqual('')
  })

  it('should return an empty string when protocolIdentifier is undefined', async () => {
    expect(
      await cryptoToFiatPipe.transform(new BigNumber(1), {
        protocolIdentifier: undefined,
        currentMarketPrice: new BigNumber(200)
      })
    ).toEqual('')
  })

  it('should return an empty string when currentMarketPrice is undefined', async () => {
    expect(
      await cryptoToFiatPipe.transform(new BigNumber(1), {
        protocolIdentifier: MainProtocolSymbols.ETH,
        currentMarketPrice: undefined
      })
    ).toEqual('')
  })
})
