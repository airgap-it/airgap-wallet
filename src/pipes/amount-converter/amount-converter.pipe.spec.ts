import { AmountConverterPipe } from './amount-converter.pipe'

describe('AmountConverter Pipe', () => {
  let amountConverterPipe: AmountConverterPipe

  beforeEach(() => {
    amountConverterPipe = new AmountConverterPipe()
  })

  it('should display very small ETH number to a non-scientific string representation', () => {
    expect(amountConverterPipe.transform('1', { protocolIdentifier: 'eth' })).toEqual('0.000000000000000001 ETH')
  })

  it('should display a normal ETH number to a non-scientific string representation', () => {
    expect(
      amountConverterPipe.transform('1000000000000000000', {
        protocolIdentifier: 'eth'
      })
    ).toEqual('1 ETH')
  })

  it('should display a big ETH number to a non-scientific string representation', () => {
    expect(
      amountConverterPipe.transform('10000000000000000000000000000000000', {
        protocolIdentifier: 'eth'
      })
    ).toEqual('10000000000000000 ETH')
  })

  it('should return a valid amount if value is 0', () => {
    expect(amountConverterPipe.transform('0', { protocolIdentifier: 'eth' })).toEqual('0 ETH')
  })

  it('should return an empty string when protocolIdentifier is not set', () => {
    expect(amountConverterPipe.transform('1', { protocolIdentifier: undefined })).toEqual('')
  })

  it('should handle values that are not a number', () => {
    expect(amountConverterPipe.transform('test', { protocolIdentifier: 'eth' })).toEqual('')
  })
})
