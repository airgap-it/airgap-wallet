import { ProtocolSymbols } from '@airgap/coinlib-core'

export enum GenericSubProtocolSymbol {
  XTZ_FA = 'xtz-fa'
}

export type GenericProtocolSymbols = GenericSubProtocolSymbol

export function faProtocolSymbol(interfaceVersion: '1.2' | '2', symbol?: string): ProtocolSymbols {
  let identifer = `${GenericSubProtocolSymbol.XTZ_FA}${interfaceVersion}`
  if (symbol) {
    identifer += `-${symbol.toLowerCase()}`
  }

  return identifer as ProtocolSymbols
}
