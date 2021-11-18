import { TezosContractMetadata } from '@airgap/coinlib-core/protocols/tezos/types/contract/TezosContractMetadata'
import { TezosFATokenMetadata } from '@airgap/coinlib-core/protocols/tezos/types/fa/TezosFATokenMetadata'
import { ContractNotFoundError, InterfaceUnknownError, TezosFAFormError, TezosFAFormErrorType, TokenInterface, TokenMetadataMissingError, TokenVagueError, UnknownError } from './tezos-fa-form.types'

export function contractNotFoundError(): ContractNotFoundError {
  return { type: TezosFAFormErrorType.CONTRACT_NOT_FOUND }
}

export function interfaceUnknownError(tokenInterfaces: TokenInterface[] = Object.values(TokenInterface)): InterfaceUnknownError {
  return { type: TezosFAFormErrorType.INTERFACE_UNKNOWN, tokenInterfaces }
}

export function tokenMetadataMissingError(): TokenMetadataMissingError {
  return { type: TezosFAFormErrorType.TOKEN_METADATA_MISSING }
}

export function tokenVaugeError(tokenMetadataRegistry: Record<number, TezosFATokenMetadata>): TokenVagueError {
  const tokens = Object.entries(tokenMetadataRegistry).map(([tokenID, tokenMetadata]) => ({
    id: parseInt(tokenID),
    name: tokenMetadata.name
  }))
  return { type: TezosFAFormErrorType.TOKEN_VAGUE, tokens }
}

export function unknownError(error?: any): UnknownError {
  return { type: TezosFAFormErrorType.UNKNOWN, error }
}

export function isTezosFAFormError(error: unknown): error is TezosFAFormError {
  return typeof error === 'object' && Object.values(TezosFAFormErrorType).includes(error['type'])
}

export function hasTokenInterface(metadata: TezosContractMetadata, tokenInterface: TokenInterface): boolean {
  const targetTzip = getTzipStandard(tokenInterface)
  if (targetTzip === undefined) {
    return false
  }

  return metadata.interfaces?.some((value: string) => {
    const tzip = getTzipStandard(value)
    if (tzip === undefined) {
      return false
    }

    return tzip === targetTzip
  }) ?? false
}

export function getTzipStandard(value: string): number | undefined {
  if (!value.toLowerCase().startsWith('tzip-')) {
    return undefined
  }

  const tzip = parseInt(value.split('-')[1], 10)
  return !isNaN(tzip) ? tzip : undefined
}