import { CoinValueConverterPipe } from './coin-value-converter.pipe'
import { BigNumber } from 'bignumber.js'

describe('CoinValueConverterPipe', () => {
  let coinValueConverterPipe: CoinValueConverterPipe

  beforeEach(() => {
    coinValueConverterPipe = new CoinValueConverterPipe()
  })

  it('should return the right price', () => {
    expect(coinValueConverterPipe.transform('1', { protocolIdentifier: 'eth', price: 200 })).toEqual(new BigNumber(200))
  })

  it('should return a price when protocolIdentifier is unknown', () => {
    expect(coinValueConverterPipe.transform('1', { protocolIdentifier: 'CoinValueConverterPipe', price: 200 })).toEqual(new BigNumber(200))
  })

  it('should return an empty string when protocolIdentifier is not set', () => {
    expect(coinValueConverterPipe.transform('1', { protocolIdentifier: undefined, price: 200 })).toEqual('')
  })

  it('should return an empty string when value is not a number', () => {
    expect(coinValueConverterPipe.transform('test', { protocolIdentifier: 'eth', price: 200 })).toEqual('')
  })

  it('should return an empty string when price is invalid', () => {
    const value: any = 'test'
    expect(coinValueConverterPipe.transform('1', { protocolIdentifier: 'eth', price: value })).toEqual('')
  })

  it('should return an empty string when price is undefined', () => {
    expect(coinValueConverterPipe.transform('1', { protocolIdentifier: 'eth', price: undefined })).toEqual('')
  })
})
