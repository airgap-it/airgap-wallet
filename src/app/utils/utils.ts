import { getProtocolAndNetworkIdentifier as _getProtocolAndNetworkIdentifier, RuntimeMode } from '@airgap/angular-core'
import { getBytesFormatV1FromV0, ICoinProtocolAdapter } from '@airgap/angular-core'
import { AirGapMarketWallet, ICoinProtocol, ICoinSubProtocol, ProtocolNetwork, ProtocolSymbols } from '@airgap/coinlib-core'
import {
  AirGapOnlineProtocol,
  Bip32Extension,
  ExtendedPublicKey,
  isBip32Protocol,
  newExtendedPublicKey,
  newPublicKey,
  PublicKey
} from '@airgap/module-kit'

// https://stackoverflow.com/a/8472700/4790610
export function generateGUID(): string {
  /* eslint-disable */
  if (typeof window.crypto !== 'undefined' && typeof window.crypto.getRandomValues !== 'undefined') {
    // If we have a cryptographically secure PRNG, use that
    // https://stackoverflow.com/questions/6906916/collisions-when-generating-uuids-in-javascript
    const buf = new Uint16Array(8)
    window.crypto.getRandomValues(buf)
    const S4 = function (num) {
      let ret = num.toString(16)
      while (ret.length < 4) {
        ret = '0' + ret
      }

      return ret
    }

    return S4(buf[0]) + S4(buf[1]) + '-' + S4(buf[2]) + '-' + S4(buf[3]) + '-' + S4(buf[4]) + '-' + S4(buf[5]) + S4(buf[6]) + S4(buf[7])
  } else {
    // Otherwise, just use Math.random
    // https://stackoverflow.com/questions/105034/how-to-create-a-guid-uuid-in-javascript/2117523#2117523
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
      const r = (Math.random() * 16) | 0
      const v = c === 'x' ? r : (r & 0x3) | 0x8

      return v.toString(16)
    })
  }
  /* eslint-enable */
}

export function to<T, U = Error>(promise: Promise<T>, errorExt?: object): Promise<[U | null, T | undefined]> {
  return promise
    .then<[null, T]>((data: T) => [null, data])
    .catch<[U, undefined]>((err: U) => {
      if (errorExt) {
        Object.assign(err, errorExt)
      }

      return [err, undefined]
    })
}

export function partition<T>(array: T[], isValid: (element: T) => boolean): [T[], T[]] {
  const pass: T[] = []
  const fail: T[] = []
  array.forEach((element: T) => {
    if (isValid(element)) {
      pass.push(element)
    } else {
      fail.push(element)
    }
  })

  return [pass, fail]
}

function readParameterFromUrl(url: string, parameter: string): string {
  try {
    const parsedUrl: URL = new URL(url)

    return parsedUrl.searchParams.get(parameter)
  } catch (error) {
    return url
  }
}

export function parseIACUrl(url: string | string[], parameter: string): string[] {
  let result: string[] | undefined
  if (Array.isArray(url)) {
    result = url.map((chunk: string) => readParameterFromUrl(chunk, parameter))
  } else {
    try {
      result = readParameterFromUrl(url, parameter).split(',')
    } catch (error) {
      result = url.split(',')
    }
  }

  // In case one of the elements contains a chunked string, we have to flatten it.
  result = result.reduce((pv: string[], cv: string) => [...pv, ...cv.split(',')], [])
  // result = result.map((value: string) => value.split(',')).flat()

  return result.filter((el: string) => el !== '')
}

export function serializedDataToUrlString(data: string | string[], host: string = 'airgap-vault://', parameter: string = 'd'): string {
  return `${host}?${parameter}=${Array.isArray(data) ? data.join(',') : data}`
}

export function isType<T>(object: unknown, ...fields: string[]): object is T {
  return object instanceof Object && fields.every((field) => field in object)
}

export function isSubProtocol(value: ICoinProtocol): value is ICoinSubProtocol {
  return 'isSubProtocol' in value && 'subProtocolType' in value
}

export function getProtocolAndNetworkIdentifier(
  protocol: ICoinProtocol | ProtocolSymbols,
  network?: ProtocolNetwork | string
): Promise<string> {
  return _getProtocolAndNetworkIdentifier(RuntimeMode.ONLINE, protocol, network)
}

// A v0 Wallet holds an untyped public key, the only way to determine if it supports
// extended public keys is by checking `isExtendedPublicKey` at runtime.
// With these util type and function we map this runtime behaviour into statically checked typing
// by saying that if `stripV1Wallet` returns a value, it is safe to assume that an `adapter`
// coming from a `wallet` has full support of a `publicKey` comming from the same `wallet`,
// regardless of whether the key is extended or not. If this statement wasn't true, the function would fail with an error.
// However, there's no implication that the returned `adapter` is extended with the `Bip32` interface
// and should be properly checked with `isBip32Protocol` before intentional use with extended public keys.
type ICoinProtocolEnhancedAdapter<T extends AirGapOnlineProtocol> = ICoinProtocolAdapter<
  T & Omit<Bip32Extension<T>, Exclude<keyof Bip32Extension<T>, keyof T>>
>

export function stripV1Wallet<T extends AirGapOnlineProtocol>(
  wallet: AirGapMarketWallet
): { adapter: ICoinProtocolEnhancedAdapter<T>; publicKey: PublicKey | ExtendedPublicKey } {
  if (!(wallet.protocol instanceof ICoinProtocolAdapter)) {
    throw new Error('Unexpected protocol instance.')
  }

  const adapter: ICoinProtocolEnhancedAdapter<T> = wallet.protocol
  const bytesFormat = getBytesFormatV1FromV0(wallet.publicKey)

  const publicKey = wallet.isExtendedPublicKey
    ? newExtendedPublicKey(wallet.publicKey, bytesFormat)
    : newPublicKey(wallet.publicKey, bytesFormat)

  if (publicKey.type === 'xpub' && !isBip32Protocol(adapter.protocolV1)) {
    throw new Error(`Protocol ${adapter.identifier} doesn't support extended keys.`)
  }

  return { adapter, publicKey }
}
