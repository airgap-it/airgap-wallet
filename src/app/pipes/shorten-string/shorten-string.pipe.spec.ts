import { ShortenStringPipe } from './shorten-string.pipe'

describe('ShortenString Pipe', () => {
  let shortenStringPipe: ShortenStringPipe

  beforeEach(() => {
    shortenStringPipe = new ShortenStringPipe()
  })

  it('should display empty string as empty string', () => {
    expect(shortenStringPipe.transform('')).toEqual('')
  })

  it('should display short string as is', () => {
    expect(shortenStringPipe.transform('abc')).toEqual('abc')
  })

  it('should NOT shorten 11 character string', () => {
    expect(shortenStringPipe.transform('abcdefghijk')).toEqual('abcdefghijk')
  })

  it('should shorten 12 character string', () => {
    expect(shortenStringPipe.transform('abcdefghijkl')).toEqual('abcde...hijkl')
  })

  it('should shorten 13 character string', () => {
    expect(shortenStringPipe.transform('abcdefghijklm')).toEqual('abcde...ijklm')
  })

  it('should shorten long string', () => {
    expect(shortenStringPipe.transform('abcdefghijklmnopqrstuvwxyz0123456789')).toEqual('abcde...56789')
  })

  it('should display empty string when value is invalid', () => {
    const value: any = { prop: 'test ' }
    expect(shortenStringPipe.transform(value)).toEqual('')
  })
})
