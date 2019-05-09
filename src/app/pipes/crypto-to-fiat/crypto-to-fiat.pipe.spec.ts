import { BigNumber } from 'bignumber.js'

import { CryptoToFiatPipe } from './crypto-to-fiat.pipe'

describe('CryptoToFiatPipe', () => {
  let cryptoToFiatPipe: CryptoToFiatPipe

  beforeEach(() => {
    cryptoToFiatPipe = new CryptoToFiatPipe()
  })

  it('should return the right price', () => {
    expect(
      cryptoToFiatPipe.transform(new BigNumber(1), {
        protocolIdentifier: 'eth',
        currentMarketPrice: new BigNumber(200)
      })
    ).toEqual('0.0000000000000002')
  })

  it('should return an empty string when protocolIdentifier is not set', () => {
    expect(
      cryptoToFiatPipe.transform(new BigNumber(1), {
        protocolIdentifier: undefined,
        currentMarketPrice: new BigNumber(200)
      })
    ).toEqual('')
  })

  it('should return an empty string when protocolIdentifier is invalid', () => {
    expect(
      cryptoToFiatPipe.transform(new BigNumber(1), {
        protocolIdentifier: 'bananarama',
        currentMarketPrice: new BigNumber(200)
      })
    ).toEqual('')
  })

  it('should return an empty string when value is not a BigNumber', () => {
    const value: any = 'test'
    expect(
      cryptoToFiatPipe.transform(value, {
        protocolIdentifier: 'eth',
        currentMarketPrice: new BigNumber(200)
      })
    ).toEqual('')
  })

  it('should return an empty string when price is not a BigNumber', () => {
    const value: any = 'test'
    expect(
      cryptoToFiatPipe.transform(new BigNumber(1), {
        protocolIdentifier: 'eth',
        currentMarketPrice: value
      })
    ).toEqual('')
  })

  it('should return an empty string when value is undefined', () => {
    expect(
      cryptoToFiatPipe.transform(undefined, {
        protocolIdentifier: 'eth',
        currentMarketPrice: new BigNumber(200)
      })
    ).toEqual('')
  })

  it('should return an empty string when protocolIdentifier is undefined', () => {
    expect(
      cryptoToFiatPipe.transform(new BigNumber(1), {
        protocolIdentifier: undefined,
        currentMarketPrice: new BigNumber(200)
      })
    ).toEqual('')
  })

  it('should return an empty string when currentMarketPrice is undefined', () => {
    expect(
      cryptoToFiatPipe.transform(new BigNumber(1), {
        protocolIdentifier: 'eth',
        currentMarketPrice: undefined
      })
    ).toEqual('')
  })
})
