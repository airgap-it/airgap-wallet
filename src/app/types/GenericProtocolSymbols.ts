import { ProtocolSymbols } from '@airgap/coinlib-core'

export enum GenericSubProtocolSymbol {
  XTZ_FA = 'xtz-fa'
}

export type GenericProtocolSymbols = GenericSubProtocolSymbol

export function faProtocolSymbol(interfaceVersion: '1.2' | '2', contractAddress?: string, tokenID: number | string = 0): ProtocolSymbols {
  let identifier = `${GenericSubProtocolSymbol.XTZ_FA}${interfaceVersion}`
  if (contractAddress) {
    identifier += `_${contractAddress}_${tokenID}`
  }

  return identifier as ProtocolSymbols
}
