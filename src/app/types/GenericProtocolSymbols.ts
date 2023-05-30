import { ProtocolSymbols } from '@airgap/coinlib-core'

export enum GenericSubProtocolSymbol {
  XTZ_FA = 'xtz-fa',
  OPTIMISM_ERC20 = 'optimism-erc20'
}

export type GenericProtocolSymbols = GenericSubProtocolSymbol

export function faProtocolSymbol(interfaceVersion: '1.2' | '2', contractAddress?: string, tokenID: number | string = 0): ProtocolSymbols {
  let identifier: string = `${GenericSubProtocolSymbol.XTZ_FA}${interfaceVersion}`
  if (contractAddress) {
    identifier += `_${contractAddress}_${tokenID}`
  }

  return identifier as ProtocolSymbols
}

export function optimismERC20ProtocolSymbol(contractAddress?: string): ProtocolSymbols {
  let identifier: string = GenericSubProtocolSymbol.OPTIMISM_ERC20
  if (contractAddress) {
    identifier += `_${contractAddress}`
  }

  return identifier as ProtocolSymbols
}