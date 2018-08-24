import { CryptoToFiatPipe } from './crypto-to-fiat.pipe'
import { BigNumber } from 'bignumber.js'

describe('CoinValueConverterPipe', () => {

  let cryptoToFiatPipe: CryptoToFiatPipe

  beforeEach(() => {
    cryptoToFiatPipe = new CryptoToFiatPipe()
  })

  it('should return the right price', () => {
    expect(cryptoToFiatPipe.transform(new BigNumber(1), { protocolIdentifier: 'eth', currentMarketPrice: new BigNumber(200) })).toEqual('0.0000000000000002')
  })

  it('should return an empty string when protocolIdentifier is not set', () => {
    expect(cryptoToFiatPipe.transform(new BigNumber(1), { protocolIdentifier: undefined, currentMarketPrice: new BigNumber(1) })).toEqual('')
  })
})
