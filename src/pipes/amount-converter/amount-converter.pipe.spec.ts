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

  it('should handle values that are undefined', () => {
    expect(amountConverterPipe.transform(undefined, { protocolIdentifier: 'eth' })).toEqual('')
  })

  it('should handle values that are null', () => {
    expect(amountConverterPipe.transform(null, { protocolIdentifier: 'eth' })).toEqual('')
  })

  it('should handle values that are empty object', () => {
    let value: any = {}
    expect(amountConverterPipe.transform(value, { protocolIdentifier: 'eth' })).toEqual('')
  })

  function getTest(args) {
    it('Test with: ' + JSON.stringify(args), () => {
      expect(amountConverterPipe.transform(args.value, { protocolIdentifier: args.protocolIdentifier })).toEqual(args.expected)
    })
  }

  function makeTests(argsArray) {
    argsArray.forEach(v => {
      getTest(v)
    })
  }

  const truthyProtocolIdentifiers = [
    { value: '1', protocolIdentifier: 'btc', expected: '0.00000001 BTC' },
    { value: '1', protocolIdentifier: 'eth', expected: '0.000000000000000001 ETH' },
    { value: '1', protocolIdentifier: 'eth-erc20-ae', expected: '0.000000000000000001 AE' }
  ]
  makeTests(truthyProtocolIdentifiers)

  const falsyValues = [
    { value: false, protocolIdentifier: 'eth', expected: '' },
    { value: 0, protocolIdentifier: 'eth', expected: '0 ETH' },
    { value: '', protocolIdentifier: 'eth', expected: '' },
    { value: null, protocolIdentifier: 'eth', expected: '' },
    { value: undefined, protocolIdentifier: 'eth', expected: '' },
    { value: NaN, protocolIdentifier: 'eth', expected: '' }
  ]
  makeTests(falsyValues)

  const falsyProtocolIdentifiers = [
    { value: '1', protocolIdentifier: false, expected: '' },
    { value: '1', protocolIdentifier: 0, expected: '' },
    { value: '1', protocolIdentifier: '', expected: '' },
    { value: '1', protocolIdentifier: null, expected: '' },
    { value: '1', protocolIdentifier: undefined, expected: '' },
    { value: '1', protocolIdentifier: NaN, expected: '' },
    { value: '1', protocolIdentifier: 'test', expected: '' },
    { value: '1', protocolIdentifier: 'asdf', expected: '' }
  ]
  makeTests(falsyProtocolIdentifiers)
})
