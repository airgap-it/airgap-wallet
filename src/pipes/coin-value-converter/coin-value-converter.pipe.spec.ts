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

  it('should return an empty string when protocolIdentifier is not set', () => {
    expect(coinValueConverterPipe.transform('1', { protocolIdentifier: undefined, price: 200 })).toEqual('')
  })
})
