import {
  ContractNotFoundError,
  OptimismERC20FormError,
  OptimismERC20FormErrorType,
  TokenMetadataMissingError,
  UnknownError
} from './optimism-erc20-form.types'

export function contractNotFoundError(): ContractNotFoundError {
  return { type: OptimismERC20FormErrorType.CONTRACT_NOT_FOUND }
}

export function tokenMetadataMissingError(): TokenMetadataMissingError {
  return { type: OptimismERC20FormErrorType.TOKEN_METADATA_MISSING }
}

export function unknownError(error?: any): UnknownError {
  return { type: OptimismERC20FormErrorType.UNKNOWN, error }
}

export function isOptimismERC20FormError(error: unknown): error is OptimismERC20FormError {
  return typeof error === 'object' && Object.values(OptimismERC20FormErrorType).includes(error['type'])
}
