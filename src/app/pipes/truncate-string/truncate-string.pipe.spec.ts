import { TruncateStringPipe } from './truncate-string.pipe'

describe('TruncateString Pipe', () => {
  let truncateStringPipe: TruncateStringPipe

  beforeEach(() => {
    truncateStringPipe = new TruncateStringPipe()
  })

  it('should display empty string as empty string', () => {
    expect(truncateStringPipe.transform('')).toEqual('')
  })

  it('should display short string as is', () => {
    expect(truncateStringPipe.transform('abc')).toEqual('abc')
  })

  it('should NOT shorten string of length equal to limit', () => {
    expect(truncateStringPipe.transform('abcdefghijk', { limit: 11 })).toEqual('abcdefghijk')
  })

  it('should shorten string of length larger than limit', () => {
    expect(truncateStringPipe.transform('abcdefghijk', { limit: 3 })).toEqual('abc...')
  })

  it('should display empty string when value is invalid', () => {
    const value: any = { prop: 'test ' }
    expect(truncateStringPipe.transform(value)).toEqual('')
  })
})
