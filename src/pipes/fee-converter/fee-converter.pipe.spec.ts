import { FeeConverterPipe } from './fee-converter.pipe'

describe('FeeConverter Pipe', () => {

  let feeConverterPipe: FeeConverterPipe

  beforeEach(() => {
    feeConverterPipe = new FeeConverterPipe()
  })

  it('should display very small ETH number to a non-scientific string representation', () => {
    expect(feeConverterPipe.transform('1', { protocolIdentifier: 'eth' })).toEqual('0.000000000000000001 ETH')
  })

  it('should display a normal ETH number to a non-scientific string representation', () => {
    expect(feeConverterPipe.transform('1000000000000000000', { protocolIdentifier: 'eth' })).toEqual('1 ETH')
  })

  it('should display a big ETH number to a non-scientific string representation', () => {
    expect(feeConverterPipe.transform('10000000000000000000000000000000000', { protocolIdentifier: 'eth' })).toEqual('10000000000000000 ETH')
  })

  it('should return a valid amount if value is 0', () => {
    expect(feeConverterPipe.transform('0', { protocolIdentifier: 'eth' })).toEqual('0 ETH')
  })

  it('should return an empty string when protocolIdentifier is not set', () => {
    expect(feeConverterPipe.transform('1', { protocolIdentifier: undefined })).toEqual('')
  })
})
